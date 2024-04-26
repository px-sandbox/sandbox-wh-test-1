import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';

const esClientObj = ElasticSearchClient.getInstance();

const getGraphData = (
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[],
  requestId: string
): object => {
  const prWaitTimeGraphQuery = esb.requestBodySearch().size(0);
  prWaitTimeGraphQuery.query(
    esb
      .boolQuery()
      .must([
        esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        esb.termsQuery('body.repoId', repoIds),
      ])
  );

  const graphIntervals = processGraphInterval(intervals, startDate, endDate);

  prWaitTimeGraphQuery
    .agg(
      graphIntervals
        .agg(esb.valueCountAggregation('pr_count', 'body.githubPullId'))
        .agg(esb.sumAggregation('pr_time_in_seconds', 'body.reviewSeconds'))
        .agg(
          esb
            .bucketScriptAggregation('combined_avg')
            .bucketsPath({ avgPrCount: 'pr_count', sumPrReviewTime: 'pr_time_in_seconds' })
            .gapPolicy('insert_zeros')
            .script(`params.avgPrCount == 0 ? 0 :(params.sumPrReviewTime / params.avgPrCount )`)
        )
    )
    .toJSON();

  logger.info({ message: 'PR_WAIT_TIME_GRAPH_ESB_QUERY', data: JSON.stringify(prWaitTimeGraphQuery), requestId });
  return prWaitTimeGraphQuery;
};
const getHeadlineQuery = (startDate: string, endDate: string, repoIds: string[], requestId:string): object => {
  const prWaitTimeAvgQuery = esb.requestBodySearch().size(0);
  prWaitTimeAvgQuery
    .query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
        ])
    )
    .agg(esb.sumAggregation('total_time', 'body.reviewSeconds'))
    .agg(esb.valueCountAggregation('pr_count', 'body.githubPullId'))
    .size(0)
    .toJSON();
  logger.info({ message: 'NUMBER_OF_PR_WAIT_TIME_AVG_ESB_QUERY', data: JSON.stringify(prWaitTimeAvgQuery), requestId });
  return prWaitTimeAvgQuery;
};

export async function prWaitTimeGraphData(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[],
  requestId: string
): Promise<GraphResponse[]> {
  try {
    const prWaitTimeGraphQuery = getGraphData(startDate, endDate, intervals, repoIds, requestId);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitPull,
        prWaitTimeGraphQuery
      );
    return data.commentsPerDay.buckets.map((item) => ({
      date: item.key_as_string as string,
      value: parseFloat((item.combined_avg.value / 3600).toFixed(2)),
    }));
  } catch (e) {
    logger.error({ message: 'prWaitTimeGraph.error', error: e, requestId });
    throw e;
  }
}

export async function prWaitTimeAvg(
  startDate: string,
  endDate: string,
  repoIds: string[],
  requestId: string
): Promise<{ value: number } | null> {
  try {
    const prWaitTimeAvgQuery = getHeadlineQuery(startDate, endDate, repoIds, requestId);
    const data: HitBody = await esClientObj.queryAggs(
      Github.Enums.IndexName.GitPull,
      prWaitTimeAvgQuery
    );

    const totalTime = Number((data.total_time.value / 3600).toFixed(2));
    const totalPr = Number(data.pr_count.value);

    return { value: totalTime === 0 ? 0 : totalTime / totalPr };
  } catch (e) {
    logger.error({ message: 'prWaitTimeAvg.error', error: e, requestId });
    throw e;
  }
}
