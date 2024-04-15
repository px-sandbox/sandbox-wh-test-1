/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssuesTypes, SprintState } from 'abstraction/jira/enums';
import { BucketItem, SprintVariance, SprintVarianceData } from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { RequestBodySearch } from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Retrieves sprint hits based on the provided parameters.
 * @param limit - The maximum number of hits to retrieve.
 * @param page - The page number of hits to retrieve.
 * @param projectId - The ID of the project.
 * @param dateRangeQueries - An array of date range queries.
 * @returns A promise that resolves to an object containing the sprint hits and the total number of pages.
 */
async function sprintHitsResponse(
  limit: number,
  page: number,
  projectId: string,
  dateRangeQueries: esb.RangeQuery[]
): Promise<{
  sprintHits: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
  totalPages: number;
}> {
  const sprintQuery = esb
    .requestBodySearch()
    .size(limit)
    .from((page - 1) * limit)
    .query(
      esb.boolQuery().must([
        esb.termQuery('body.projectId', projectId),
        esb.termQuery('body.isDeleted', false),
        esb.boolQuery().should(dateRangeQueries).minimumShouldMatch(1),
        esb
          .boolQuery()
          .should([
            esb.termQuery('body.state', SprintState.ACTIVE),
            esb.termQuery('body.state', SprintState.CLOSED),
          ])
          .minimumShouldMatch(1),
      ])
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();

  logger.info('sprintQuery', sprintQuery);
  const body = (await esClientObj.search(
    Jira.Enums.IndexName.Sprint,
    sprintQuery
  )) as Other.Type.HitBody;
  return {
    sprintHits: await searchedDataFormator(body),
    totalPages: Math.ceil(body.hits.total.value / limit),
  };
}

/**
 * Retrieves the estimated and actual time data for a given set of sprints.
 * @param sortKey - The key to sort the sprint aggregation by.
 * @param sortOrder - The sort order ('desc' or 'asc') for the sprint aggregation.
 * @param sprintIds - An array of sprint IDs to retrieve data for.
 * @returns A promise that resolves to an object containing the sprint aggregation data.
 */
async function estimateActualGraphResponse(
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: 'desc' | 'asc',
  sprintIds: string[]
): Promise<{
  sprint_aggregation: { buckets: BucketItem[] };
}> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .agg(
      esb
        .termsAggregation('sprint_aggregation', 'body.sprintId')
        .order(sortKey, sortOrder)
        .size(10)
        .aggs([
          esb.sumAggregation('estimate', 'body.timeTracker.estimate'),
          esb.sumAggregation('actual', 'body.timeTracker.actual'),
        ])
    )
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.sprintId', sprintIds), esb.termQuery('body.isDeleted', false)])
        .filter(esb.rangeQuery('body.timeTracker.estimate').gt(0))
        .should([
          esb.termQuery('body.issueType', IssuesTypes.STORY),
          esb.termQuery('body.issueType', IssuesTypes.TASK),
          esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON() as { query: object };
  logger.info('issue_sprint_query', query);

  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
}

/**
 * Calculates the sprint variance for each sprint in the given sprint data.
 * @param sprintData An array of sprint data.
 * @param estimateActualGraph The estimate actual graph containing sprint aggregation data.
 * @returns An array of SprintVariance objects representing the sprint variance for each sprint.
 */
function sprintEstimateResponse(
  sprintData: any[],
  estimateActualGraph: {
    sprint_aggregation: {
      buckets: Jira.Type.BucketItem[];
    };
  }
): SprintVariance[] {
  return sprintData.map((sprintDetails) => {
    const item = estimateActualGraph.sprint_aggregation.buckets.find(
      (bucketItem: BucketItem) => bucketItem.key === sprintDetails.id
    );
    if (item) {
      return {
        sprint: sprintDetails,
        time: {
          estimate: item.estimate.value,
          actual: item.actual.value,
        },
        variance: parseFloat(
          (item.estimate.value === 0
            ? 0
            : ((item.actual.value - item.estimate.value) * 100) / item.estimate.value
          ).toFixed(2)
        ),
      };
    }
    return {
      sprint: sprintDetails,
      time: {
        estimate: 0,
        actual: 0,
      },
      variance: 0,
    };
  });
}

/**
 * Returns an array of Elasticsearch range queries for filtering date ranges.
 *
 * @param startDate - The start date of the range.
 * @param endDate - The end date of the range (optional).
 * @returns An array of Elasticsearch range queries.
 */
function getDateRangeQueries(startDate: string, endDate: string): esb.RangeQuery[] {
  let dateRangeQueries = [
    esb.rangeQuery('body.startDate').gte(startDate),
    esb.rangeQuery('body.endDate').gte(startDate),
  ];

  if (endDate) {
    dateRangeQueries = [
      esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
      esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
    ];
  }
  return dateRangeQueries;
}
/**
 * Retrieves the sprint variance graph data for a given project within a specified date range.
 * @param projectId - The ID of the project.
 * @param startDate - The start date of the date range.
 * @param endDate - The end date of the date range.
 * @param page - The page number for pagination.
 * @param limit - The maximum number of results per page.
 * @param sortKey - The key to sort the results by.
 * @param sortOrder - The order to sort the results in ('asc' or 'desc').
 * @returns A Promise that resolves to the sprint variance data.
 * @throws An error if an error occurs while retrieving the data.
 */
export async function sprintVarianceGraph(
  projectId: string,
  startDate: string,
  endDate: string,
  page: number,
  limit: number,
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: 'asc' | 'desc'
): Promise<SprintVarianceData> {
  try {
    const dateRangeQueries = getDateRangeQueries(startDate, endDate);

    const { sprintHits, totalPages } = await sprintHitsResponse(
      limit,
      page,
      projectId,
      dateRangeQueries
    );

    const sprintData: any = [];
    const sprintIds: any = [];
    await Promise.all(
      sprintHits.map(async (item: Other.Type.HitBody) => {
        sprintData.push({
          id: item.id,
          name: item.name,
          status: item.state,
          startDate: item.startDate,
          endDate: item.endDate,
        });
        sprintIds.push(item.id);
      })
    );

    const estimateActualGraph = await estimateActualGraphResponse(sortKey, sortOrder, sprintIds);
    const sprintEstimate = sprintEstimateResponse(sprintData, estimateActualGraph);

    return {
      data: sprintEstimate,
      totalPages,
      page,
    };
  } catch (e) {
    throw new Error(`error_occured_sprint_variance: ${e}`);
  }
}

/**
 * Creates a search query for retrieving sprints based on the specified project ID and date range queries.
 *
 * @param projectId - The ID of the project.
 * @param dateRangeQueries - An array of date range queries.
 * @returns The search query for retrieving sprints.
 */
function createSprintQuery(
  projectId: string,
  dateRangeQueries: esb.RangeQuery[]
): RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb.boolQuery().must([
        esb.termQuery('body.projectId', projectId),
        esb.termQuery('body.isDeleted', false),
        esb.boolQuery().should(dateRangeQueries).minimumShouldMatch(1),
        esb
          .boolQuery()
          .should([
            esb.termQuery('body.state', SprintState.ACTIVE),
            esb.termQuery('body.state', SprintState.CLOSED),
          ])
          .minimumShouldMatch(1),
      ])
    )
    .sort(esb.sort('body.sprintId'));
}

/**
 * Retrieves the estimated and actual time for a given array of sprint IDs.
 *
 * @param sprintIdsArr - An array of sprint IDs.
 * @returns A promise that resolves to an object containing the estimated and actual time.
 */
async function ftpRateGraphResponse(sprintIdsArr: string[]): Promise<{
  estimatedTime: { value: number };
  actualTime: { value: number };
}> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .aggs([
      esb.sumAggregation('estimatedTime', 'body.timeTracker.estimate'),
      esb.sumAggregation('actualTime', 'body.timeTracker.actual'),
    ])
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIdsArr),
          esb.termQuery('body.isDeleted', false),
        ])
        .filter(esb.rangeQuery('body.timeTracker.estimate').gt(0))
        .should([
          esb.termQuery('body.issueType', IssuesTypes.STORY),
          esb.termQuery('body.issueType', IssuesTypes.TASK),
          esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  logger.info('issue_for_sprints_query', query);

  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
}

/**
 * Calculates the average sprint variance graph for a given project within a specified date range.
 * @param projectId - The ID of the project.
 * @param startDate - The start date of the date range.
 * @param endDate - The end date of the date range.
 * @returns A Promise that resolves to the average sprint variance as a number.
 * @throws If an error occurs during the calculation.
 */
export async function sprintVarianceGraphAvg(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<number> {
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
    logger.info('sprintIds', { sprintIdsArr });

    const ftpRateGraph = await ftpRateGraphResponse(sprintIdsArr);
    return parseFloat(
      (ftpRateGraph.estimatedTime.value === 0
        ? 0
        : ((ftpRateGraph.actualTime.value - ftpRateGraph.estimatedTime.value) * 100) /
          ftpRateGraph.estimatedTime.value
      ).toFixed(2)
    );
  } catch (e) {
    throw new Error(`error_occured_sprint_variance_avg: ${e}`);
  }
}
