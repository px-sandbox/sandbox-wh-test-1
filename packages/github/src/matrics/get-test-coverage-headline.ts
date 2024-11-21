import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import {
  TestCoverageHeadline,
  TestCoverageHeadlineResponse,
  TestCoverageHeadlineResponseDTO,
} from 'abstraction/github/type/test-coverage';
import { logger } from 'core';
import esb from 'elastic-builder';

const esClientObj = ElasticSearchClient.getInstance();

const getTestCoverage = async (repoIds: string[]): Promise<TestCoverageHeadline> => {
  const getTestCoverageQuery = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.cron', false)])
    )
    .agg(
      esb
        .termsAggregation('by_repoId', 'body.repoId')
        .agg(
          esb
            .topHitsAggregation('latest_createdAt')
            .size(1)
            .sort(esb.sort('body.createdAt', 'desc'))
        )
    )
    .toJSON();

  const getTestCoverageData = (await esClientObj.queryAggs(
    Github.Enums.IndexName.GitTestCoverage,
    getTestCoverageQuery
  )) as TestCoverageHeadline;
  return getTestCoverageData;
};

export const getTestCoverageHeadlineData = async (
  repoIds: string[]
): Promise<TestCoverageHeadlineResponse> => {
  let totalPct = 0;
  try {
    const testCoverageResponse: TestCoverageHeadline = await getTestCoverage(repoIds);
    logger.info({
      message: 'getTestCoverageHeadlineData.info: Test-Coverage-Headline',
      data: testCoverageResponse,
    });

    if (testCoverageResponse.by_repoId.buckets.length > 0) {
      testCoverageResponse.by_repoId.buckets.forEach((bucket) => {
        totalPct += bucket.latest_createdAt.hits.hits[0]._source.body.lines.pct;
      });

      const testCoverageData = Number(
        (totalPct / testCoverageResponse.by_repoId.buckets.length).toFixed(2)
      );
      return {
        value: testCoverageData,
      };
    } else {
      logger.error({ message: 'getData.error', error: 'No data found' });
      return { value: 0 };
    }
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
