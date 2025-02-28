import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { createSprintQuery, getDateRangeQueries } from './get-sprint-variance';

const esClientObj = ElasticSearchClient.getInstance();

interface TimeAggregation {
  value: number;
}

interface Bucket {
  key: string;
  doc_count: number;
  total_time: TimeAggregation;
}

interface CategoryNames {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: Bucket[];
}

interface GraphDataResponse {
  category_names: CategoryNames;
}
async function getGraphData(
  sprintIdsArr: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<GraphDataResponse> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .aggs([
      esb
        .termsAggregation('category_names', 'body.category')
        .aggs([esb.sumAggregation('total_time', 'body.timeLogged')]),
    ])
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIdsArr),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .toJSON();
  logger.info({ ...reqCtx, message: 'graph data for sprints', data: { query } });
  return esClientObj.queryAggs(Jira.Enums.IndexName.Worklog, query);
}

export async function getTimeSpentGraphData(
  projectId: string,
  startDate: string,
  endDate: string,
  reqCtx: Other.Type.RequestCtx
): Promise<Record<string, number>> {
  const sprintIdsArr = [];
  try {
    const dateRangeQueries = getDateRangeQueries(startDate, endDate);
    const sprintQuery = createSprintQuery(projectId, dateRangeQueries);
    let sprintIds = [];
    let lastHit;
    do {
      const query = sprintQuery.searchAfter(lastHit);
      const body: Other.Type.HitBody = await esClientObj.search(Jira.Enums.IndexName.Sprint, query);
      lastHit = body.hits.hits[body.hits.hits.length - 1]?.sort;
      sprintIds = await searchedDataFormator(body);
      sprintIdsArr.push(...sprintIds.map((id) => id.id));
    } while (sprintIds?.length);
    logger.info({ ...reqCtx, message: 'sprintIds', data: { sprintIdsArr } });
    const graphData = await getGraphData(sprintIdsArr, reqCtx);
    // Extract buckets
    const buckets = graphData?.category_names?.buckets;
    let totalTime = 0;
    for (const bucket of buckets) {
      totalTime += bucket.total_time.value || 0;
    }
    const formattedGraphData: Record<string, number> = {};
    for (const bucket of buckets) {
      formattedGraphData[bucket.key] = totalTime
        ? Math.round((bucket.total_time.value / totalTime) * 100)
        : 0;
    }
    return formattedGraphData;
  } catch (e) {
    throw new Error(`error_occurred_for_timespent_graph_data: ${e}`);
  }
}
