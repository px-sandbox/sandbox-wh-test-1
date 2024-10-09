import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import {
  TestCoverageHeadlineResponse,
  TestCoverageHeadlineResponseDTO,
} from 'abstraction/github/type/test-coverage';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

const getTestCoverage = async (
  repoIds: string[],
  todaysDate: string
): Promise<TestCoverageHeadlineResponseDTO[]> => {
  const getTestCoverageQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.forDate', todaysDate)])
    )
    .toJSON();

  const getTestCoverageData = await esClientObj.search(
    Github.Enums.IndexName.GitTestCoverage,
    getTestCoverageQuery
  );
  const testCoverageData = await searchedDataFormator(getTestCoverageData);
  return testCoverageData;
};

export const getTestCoverageHeadlineData = async (
  repoIds: string[],
  todaysDate: string
): Promise<TestCoverageHeadlineResponse> => {
  try {
    const testCoverageResponse: TestCoverageHeadlineResponseDTO[] = await getTestCoverage(
      repoIds,
      todaysDate
    );
    logger.info({
      message: 'getTestCoverageHeadlineData.info: Test-Coverage-Headline',
      data: JSON.stringify(testCoverageResponse),
    });

    if (testCoverageResponse.length) {
      let totalPct = 0;

      testCoverageResponse.forEach((cov: { statements: { pct: number } }) => {
        if (cov.statements && cov.statements) {
          totalPct += cov.statements.pct;
        }
      });

      const averagePct = Number((totalPct / testCoverageResponse.length).toFixed(2));
      logger.info({
        message: 'getTestCoverageHeadlineData.info: Average-Statement-Coverage-Percentage',
        data: averagePct,
      });
      return {
        value: averagePct,
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
