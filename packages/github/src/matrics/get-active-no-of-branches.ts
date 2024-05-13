import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';

const esClientObj = ElasticSearchClient.getInstance();

const getGraphDataQuery = async (
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[],
  requestId: string
): Promise<object> => {
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
        .agg(esb.valueCountAggregation('repo_count', 'body.repoId'))
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

  logger.info({
    message: 'getGraphDataQuery.info ACTIVE_BRANCHES_GRAPH_ESB_QUERY',
    data: JSON.stringify(activeBranchGraphQuery),
    requestId,
  });
  return activeBranchGraphQuery;
};
const getHeadlineQuery = async (
  startDate: string,
  endDate: string,
  repoIds: string[],
  requestId: string
): Promise<object> => {
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
    .agg(esb.valueCountAggregation('repo_count', 'body.repoId'))
    .agg(esb.sumAggregation('branch_count', 'body.branchesCount'))
    .size(0)
    .toJSON();
  logger.info({
    message: 'getHeadlineQuery.info ACTIVE_BRANCHES_AVG_ESB_QUERY',
    data: JSON.stringify(activeBranchesAvgQuery),
    requestId,
  });
  return activeBranchesAvgQuery;
};
export async function activeBranchGraphData(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[],
  requestId: string
): Promise<{ date: string; value: number }[]> {
  try {
    const activeBranchGraphQuery = await getGraphDataQuery(
      startDate,
      endDate,
      intervals,
      repoIds,
      requestId
    );
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
    logger.error({ message: 'activeBranchGraph.error', error: e, requestId });
    throw e;
  }
}
export async function activeBranchesAvg(
  startDate: string,
  endDate: string,
  repoIds: string[],
  requestId: string
): Promise<{ value: number } | null> {
  try {
    const activeBranchesAvgQuery = await getHeadlineQuery(startDate, endDate, repoIds, requestId);
    const data: any = await esClientObj.queryAggs(
      Github.Enums.IndexName.GitActiveBranches,
      activeBranchesAvgQuery
    );
    logger.info({ message: 'activeBranchesAvg.data', data });
    const totalRepo = Number(data.repo_count.value);
    const totalBranchCount = Number(data.branch_count.value);
    return {
      value: parseFloat((totalBranchCount === 0 ? 0 : totalBranchCount / totalRepo).toFixed(2)),
    };
  } catch (e) {
    logger.error({ message: 'activeBranchesAvg.error', error: e });
    throw e;
  }
}
