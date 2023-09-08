import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { esbDateHistogramInterval } from '../constant/config';

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
    case esbDateHistogramInterval.year:
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
export async function activeBranchGraphData(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<{ date: string; value: number }[]> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const activeBranchGraphQuery = esb.requestBodySearch().size(0);
    activeBranchGraphQuery.query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
        ])
    );

    const graphIntervals = processGraphInterval(intervals, startDate, endDate);

    activeBranchGraphQuery
      .agg(
        graphIntervals
          .agg(esb.valueCountAggregation('repo_count', 'body.repoId.keyword'))
          .agg(esb.sumAggregation('branch_count', 'body.branchesCount'))
          .agg(
            esb
              .bucketScriptAggregation('combined_avg')
              .bucketsPath({ branchCount: 'branch_count', repoCount: 'repo_count' })
              .gapPolicy('insert_zeros')
              .script('params.branchCount == 0 ? 0 :(params.branchCount / params.repoCount )')
          )
      )
      .toJSON();

    logger.info('ACTIVE_BRANCHES_GRAPH_ESB_QUERY', activeBranchGraphQuery);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitActiveBranches,
        activeBranchGraphQuery
      );
    return data.commentsPerDay.buckets.map((item) => ({
      date: item.key_as_string,
      value: parseFloat(item.combined_avg.value.toFixed(2)),
    }));
  } catch (e) {
    logger.error('activeBranchGraph.error', e);
    throw e;
  }
}
export async function activeBranchesAvg(
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<{ value: number } | null> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const activeBranchesAvgQuery = await esb.requestBodySearch().size(0);
    activeBranchesAvgQuery
      .query(
        esb
          .boolQuery()
          .must([
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            esb.termsQuery('body.repoId', repoIds),
          ])
      )
      .agg(esb.valueCountAggregation('repo_count', 'body.repoId.keyword'))
      .agg(esb.sumAggregation('branch_count', 'body.branchesCount'))
      .size(0)
      .toJSON();
    logger.info('ACTIVE_BRANCHES_AVG_ESB_QUERY', activeBranchesAvgQuery);
    const data = await esClientObj.getClient().search({
      index: Github.Enums.IndexName.GitPull,
      body: activeBranchesAvgQuery,
    });

    const totalRepo = Number(data.body.aggregations.repo_count.value);
    const totalBranchCount = Number(data.body.aggregations.branch_count.value);
    return { value: totalBranchCount === 0 ? 0 : totalBranchCount / totalRepo };
  } catch (e) {
    logger.error('activeBranchesAvg.error', e);
    throw e;
  }
}
