/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IReopenRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { RequestBodySearch } from 'elastic-builder';
import _ from 'lodash';
import { getSprints } from '../lib/get-sprints';
import { getBoardByOrgId } from '../repository/board/get-board';
import { IssueResponse } from '../util/response-formatter';

interface ReopenRateQueryResponse {
  hits: {
    total: {
      value: number;
    };
  };
  aggregations: {
    reopenRate: {
      doc_count: number;
    };
  };
}

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Constructs a request body search query for retrieving reopen rates.
 * @param sprintIds - An array of sprint IDs.
 * @returns The constructed RequestBodySearch object.
 */
function requestBodySearchQuery(sprintIds: string[]): RequestBodySearch {
  return esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.sprintId', sprintIds), esb.termQuery('body.isDeleted', false)])
    );
}
/**
 * Retrieves the reopen rate query response for the given sprint IDs.
 *
 * @param sprintIds - An array of sprint IDs.
 * @returns A promise that resolves to the reopen rate response.
 */
async function reopenRateQueryRes(
  sprintIds: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<IReopenRateResponse> {
  const reopenRateGraphQuery = requestBodySearchQuery(sprintIds)
    .agg(
      esb
        .termsAggregation('sprint_buckets', 'body.sprintId')
        .size(sprintIds.length)
        .agg(esb.filterAggregation('reopen_count', esb.rangeQuery('body.reOpenCount').gt(0)))
    )
    .toJSON();

  logger.info({ ...reqCtx, message: 'reopenRateGraphQuery', data: { reopenRateGraphQuery } });

  return esClientObj.queryAggs<IReopenRateResponse>(
    Jira.Enums.IndexName.ReopenRate,
    reopenRateGraphQuery
  );
}
/**
 * Retrieves the reopen rate query response for the given sprint IDs.
 * @param sprintIds - An array of sprint IDs.
 * @returns A Promise that resolves to the reopen rate query response.
 */
async function reopenRateQueryResponse(
  sprintIds: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<ReopenRateQueryResponse> {
  const reopenRateGraphQuery = requestBodySearchQuery(sprintIds)
    .agg(esb.filterAggregation('reopenRate', esb.rangeQuery('body.reOpenCount').gt(0)))
    .toJSON();

  logger.info({ ...reqCtx, message: 'AvgReopenRateGraphQuery', data: { reopenRateGraphQuery } });

  const response = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, reopenRateGraphQuery);
  return response as unknown as ReopenRateQueryResponse;
}
/**
 * Retrieves the reopen rate graph data for the given sprint IDs.
 * @param sprintIds An array of sprint IDs.
 * @returns A promise that resolves to an array of IssueResponse objects.
 */
export async function reopenRateGraph(
  sprintIds: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<IssueResponse[]> {
  try {
    const reopenRateGraphResponse = await reopenRateQueryRes(sprintIds, reqCtx);

    let response: IssueResponse[] = await Promise.all(
      sprintIds.map(async (sprintId) => {
        const sprintData = await getSprints(sprintId);
        const boardName = await getBoardByOrgId(
          sprintData?.originBoardId,
          sprintData?.organizationId,
          reqCtx
        );
        const bugsData = reopenRateGraphResponse.sprint_buckets.buckets.find(
          (obj) => obj.key === sprintId
        );

        const totalBugs = bugsData?.doc_count ?? 0;
        const totalReopen = bugsData?.reopen_count?.doc_count ?? 0;
        const percentValue = totalBugs === 0 ? 0 : (totalReopen / totalBugs) * 100;

        return {
          totalBugs,
          totalReopen,
          sprintName: sprintData?.name,
          boardName: boardName?.name,
          status: sprintData?.state,
          startDate: sprintData?.startDate,
          endDate: sprintData?.endDate,
          percentValue: Number.isNaN(percentValue) ? 0 : Number(percentValue.toFixed(2)),
        };
      })
    );
    response = _.sortBy(response, [
      (item: IssueResponse): Date => new Date(item.startDate),
    ]).reverse();
    return response.filter((obj) => obj.sprintName !== undefined);
  } catch (e) {
    logger.error({ ...reqCtx, message: 'reopenRateGraphQuery.error', error: e });
    throw e;
  }
}

/**
 * Calculates the average reopen rate for a given array of sprint IDs.
 * @param sprintIds - An array of sprint IDs.
 * @returns A Promise that resolves to an object containing the total number of bugs,
 * total number of reopen bugs, and the reopen rate percentage.
 */
export async function reopenRateGraphAvg(
  sprintIds: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<{ totalBugs: number; totalReopen: number; percentValue: number }> {
  try {
    const reopenRateGraphResponse = await reopenRateQueryResponse(sprintIds, reqCtx);
    return {
      totalBugs: reopenRateGraphResponse.hits.total.value ?? 0,
      totalReopen: reopenRateGraphResponse.aggregations.reopenRate.doc_count ?? 0,
      percentValue:
        reopenRateGraphResponse.aggregations.reopenRate.doc_count === 0
          ? 0
          : Number(
              (
                (reopenRateGraphResponse.aggregations.reopenRate.doc_count /
                  reopenRateGraphResponse.hits.total.value) *
                100
              ).toFixed(2)
            ),
    };
  } catch (e) {
    logger.error({ ...reqCtx, message: 'AvgReopenRateGraphQuery.error', error: e });
    throw e;
  }
}
