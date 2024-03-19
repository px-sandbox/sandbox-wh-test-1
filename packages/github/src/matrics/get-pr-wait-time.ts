import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { esbDateHistogramInterval } from '../constant/config';

const esClientObj = ElasticSearchClientGh.getInstance();
function processGraphInterval(
  intervals: string,
  startDate: string,
  endDate: string
): esb.DateHistogramAggregation {
  // By default graph interval is day
  let graphIntervals: esb.DateHistogramAggregation;

  switch (intervals) {
    case esbDateHistogramInterval.day:
    case esbDateHistogramInterval.month:
      graphIntervals = esb
        .dateHistogramAggregation('commentsPerDay')
        .field('body.createdAt')
        .format('yyyy-MM-dd')
        .calendarInterval(intervals)
        .extendedBounds(startDate, endDate)
        .minDocCount(0);
      break;
    case esbDateHistogramInterval['2d']:
    case esbDateHistogramInterval['3d']:
      graphIntervals = esb
        .dateHistogramAggregation('commentsPerDay')
        .field('body.createdAt')
        .format('yyyy-MM-dd')
        .fixedInterval(intervals)
        .extendedBounds(startDate, endDate)
        .minDocCount(0);
      break;
    default:
      graphIntervals = esb
        .dateHistogramAggregation('commentsPerDay')
        .field('body.createdAt')
        .format('yyyy-MM-dd')
        .calendarInterval(esbDateHistogramInterval.month)
        .extendedBounds(startDate, endDate)
        .minDocCount(0);
  }
  return graphIntervals;
}
export async function prWaitTimeGraphData(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<GraphResponse[]> {
  try {
    const prWaitTimeGraphQuery = await esb.requestBodySearch().size(0);
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

    logger.info('PR_WAIT_TIME_GRAPH_ESB_QUERY', prWaitTimeGraphQuery);
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
    logger.error('prWaitTimeGraph.error', e);
    throw e;
  }
}

export async function prWaitTimeAvg(
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<{ value: number } | null> {
  try {
    const prWaitTimeAvgQuery = await esb.requestBodySearch().size(0);
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
    logger.info('NUMBER_OF_PR_WAIT_TIME_AVG_ESB_QUERY', prWaitTimeAvgQuery);
    const data:HitBody = await esClientObj.queryAggs(
      Github.Enums.IndexName.GitPull,
      prWaitTimeAvgQuery,
    );

    const totalTime = Number((data.total_time.value / 3600).toFixed(2));
    const totalPr = Number(data.pr_count.value);
    // const weekDaysCount = getWeekDaysCount(startDate, endDate);
    return { value: totalTime === 0 ? 0 : totalTime / totalPr };
  } catch (e) {
    logger.error('prWaitTimeAvg.error', e);
    throw e;
  }
}
