import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from 'src/util/process-graph-intervals';
const esClientObj = ElasticSearchClient.getInstance();
export const getData = async (
  repoIds: string[],
  startDate: string,
  endDate: string,
  interval: string
): Promise<{ date: string; value: object }[]> => {
  try {
    const testCoverageGraph = esb.requestBodySearch().size(0);
    testCoverageGraph.query(esb.boolQuery().must([esb.termsQuery('body.repoId', repoIds)]));
    const graphIntervals = processGraphInterval(interval, startDate, endDate);
    testCoverageGraph.agg(
      graphIntervals.agg(
        esb
          .termsAggregation('by_repo', 'body.repoId')
          .agg(esb.avgAggregation('total_lines', 'body.lines.pct'))
      )
    );
    console.log(JSON.stringify(testCoverageGraph.toJSON()));
    const data = await esClientObj.queryAggs<IPrCommentAggregationResponse>(
      Github.Enums.IndexName.GitTestCoverage,
      testCoverageGraph.toJSON()
    );

    return data.commentsPerDay.buckets.map((bucket: any) => ({
      date: bucket.key_as_string,
      value: bucket.by_repo.buckets,
    }));
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
