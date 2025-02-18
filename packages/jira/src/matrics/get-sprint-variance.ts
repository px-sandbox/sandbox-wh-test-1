/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { BucketItem, SprintVariance, SprintVarianceData } from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { RequestBodySearch } from 'elastic-builder';
import { getOrganizationById } from '../repository/organization/get-organization';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

function getJiraLink(
  orgName: string,
  projectKey: string,
  sprintId: number,
  isOgEstimate = false
): string {
  const baseUrl = `https://${orgName}.atlassian.net/jira/software/c/projects/${projectKey}/issues/?jql=
  project = "${projectKey}" and sprint = ${sprintId}`;
  const query = isOgEstimate
    ? 'AND OriginalEstimate IS EMPTY'
    : 'AND TimeSpent IS EMPTY AND OriginalEstimate != EMPTY';
  const orderBy = 'AND type != Test ORDER BY created DESC';
  return encodeURI(`${baseUrl} ${query} ${orderBy}`);
}

/**
 * Retrieves sprint hits based on the provided parameters.
 * @param limit - The maximum number of hits to retrieve.
 * @param page - The page number of hits to retrieve.
 * @param projectId - The ID of the project.
 * @param dateRangeQueries - An array of date range queries.
 * @returns A promise that resolves to an object containing the sprint hits and the total number of pages.
 */
export async function sprintHitsResponse(
  limit: number,
  page: number,
  projectId: string,
  dateRangeQueries: esb.RangeQuery[],
  reqCtx: Other.Type.RequestCtx,
  sprintState?: string
): Promise<{
  sprintHits: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
  totalPages: number;
}> {
  const sprintQuery = esb
    .requestBodySearch()
    .size(limit)
    .from((page - 1) * limit)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.isDeleted', false),
          esb.boolQuery().should(dateRangeQueries).minimumShouldMatch(1),
          sprintState
            ? esb.termQuery('body.state', sprintState)
            : esb.termsQuery('body.state', [
                Jira.Enums.SprintState.CLOSED,
                Jira.Enums.SprintState.ACTIVE,
              ]),
        ])
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();

  logger.info({ ...reqCtx, message: 'sprintQuery', data: { sprintQuery } });
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
  sprintIds: string[],
  reqCtx: Other.Type.RequestCtx
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
          esb
            .boolQuery()
            .must(esb.termQuery('body.issueType', IssuesTypes.BUG))
            .mustNot(esb.existsQuery('body.issueLinks')),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON() as { query: object };
  logger.info({ ...reqCtx, message: 'issue_sprint_query', data: { query } });

  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
}

async function countIssuesWithZeroEstimates(
  sprintIds: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<{
  sprint_aggregation: {
    buckets: Jira.Type.BucketItem[];
  };
}> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .agg(esb.termsAggregation('sprint_aggregation', 'body.sprintId'))
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.isDeleted', false),
          esb.termQuery('body.timeTracker.estimate', 0),
        ])
        .should([
          esb.termQuery('body.issueType', IssuesTypes.STORY),
          esb.termQuery('body.issueType', IssuesTypes.TASK),
          esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
          esb
            .boolQuery()
            .must(esb.termQuery('body.issueType', IssuesTypes.BUG))
            .mustNot(esb.existsQuery('body.issueLinks')),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON() as { query: object };

  logger.info({ ...reqCtx, message: 'issue_sprint_query_estimate_zero', data: { query } });

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
  },
  bugTimeActual: [{ sprintId: string; bugTime: number }],
  issueWithZeroEstimate: {
    sprint_aggregation: {
      buckets: Jira.Type.BucketItem[];
    };
  },
  orgName: string,
  projectKey: string
): SprintVariance[] {
  return sprintData.map((sprintDetails) => {
    let estimateMissingFlagCtr = true;
    const item = estimateActualGraph.sprint_aggregation.buckets.find(
      (bucketItem: BucketItem) => bucketItem.key === sprintDetails.id
    );
    const bugTime = bugTimeActual.find(
      (bugData: { sprintId: string; bugTime: number }) => bugData.sprintId === sprintDetails.id
    );
    const estimateCount = issueWithZeroEstimate.sprint_aggregation.buckets.find(
      (bucketItem: BucketItem) => bucketItem.key === sprintDetails.id
    );
    if (estimateCount && estimateCount.doc_count > 4) {
      estimateMissingFlagCtr = false;
    }
    if (item) {
      return {
        sprint: sprintDetails,
        time: {
          estimate: item.estimate.value,
          actual: item.actual.value,
        },
        isAllEstimated: estimateMissingFlagCtr,
        jiraInfo: {
          estimateIssueLink: !estimateMissingFlagCtr
            ? getJiraLink(orgName, projectKey, sprintDetails.sprintId, true)
            : '',
          loggedIssueLink: getJiraLink(orgName, projectKey, sprintDetails.sprintId),
        },
        variance: parseFloat(
          (item.estimate.value === 0
            ? 0
            : ((item.actual.value - item.estimate.value) * 100) / item.estimate.value
          ).toFixed(2)
        ),
        bugTime: bugTime?.bugTime ?? 0,
        totalTime: (bugTime?.bugTime ?? 0) + (item.actual.value ?? 0),
      };
    }
    return {
      sprint: sprintDetails,
      time: {
        estimate: 0,
        actual: 0,
      },
      isAllEstimated: estimateMissingFlagCtr,
      jiraInfo: {
        estimateIssueLink: !estimateMissingFlagCtr
          ? getJiraLink(orgName, projectKey, sprintDetails.sprintId, true)
          : '',
        loggedIssueLink: getJiraLink(orgName, projectKey, sprintDetails.sprintId),
      },
      variance: 0,
      bugTime: 0,
      totalTime: 0,
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
export function getDateRangeQueries(startDate: string, endDate: string): esb.RangeQuery[] {
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

export function getBugIssueLinksKeys(issueLinks: Jira.Type.IssueLinks[]): string[] | [] {
  // Iterate through the issueLinks array
  const bugKeys = [];
  for (const link of issueLinks) {
    if (link.type === Jira.Enums.IssuesTypes.BUG) {
      bugKeys.push(link.key);
    }
  }
  return bugKeys; // Return null if no Bug type issue is found
}

async function getBugTimeForSprint(
  sprintId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<{
  actual: { value: number };
}> {
  const query = esb
    .requestBodySearch()
    .size(1000)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.sprintId', sprintId),
          esb.termQuery('body.isDeleted', false),
          esb.existsQuery('body.issueLinks'),
        ])
        .filter(esb.rangeQuery('body.timeTracker.estimate').gt(0))
        .should([
          esb.termQuery('body.issueType', IssuesTypes.STORY),
          esb.termQuery('body.issueType', IssuesTypes.TASK),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  logger.info({ ...reqCtx, message: 'bug_time_for_sprint_query', data: { query } });

  const res = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
  const issueData = await searchedDataFormator(res);
  // find issueKeys from issuelinks of the issue data
  const issueKeys = issueData.map((items) => getBugIssueLinksKeys(items.issueLinks)).flat();
  // sum aggregate the time spent on bugs for the given issueKeys
  const bugQuery = esb
    .requestBodySearch()
    .size(0)
    .agg(esb.sumAggregation('actual', 'body.timeTracker.actual'))
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.issueKey', issueKeys), esb.termQuery('body.isDeleted', false)])
        .should([esb.termQuery('body.issueType', IssuesTypes.BUG)])
        .minimumShouldMatch(1)
    )
    .toJSON();

  logger.info({ ...reqCtx, message: 'bug_time_for_sprint_query', data: { bugQuery } });

  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, bugQuery);
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
  sortOrder: 'asc' | 'desc',
  reqCtx: Other.Type.RequestCtx,
  organizationId: string,
  sprintState?: string
): Promise<SprintVarianceData> {
  try {
    let orgName = '';
    let projectKey = '';

    const query = esb.requestBodySearch().query(esb.termQuery('body.id', projectId)).toJSON();
    const [orgData, projects] = await Promise.all([
      getOrganizationById(organizationId),
      esClientObj.search(Jira.Enums.IndexName.Project, query),
    ]);
    const projectData = await searchedDataFormator(projects);
    orgName = orgData[0].name;
    projectKey = projectData[0].key;

    const dateRangeQueries = getDateRangeQueries(startDate, endDate);

    const { sprintHits, totalPages } = await sprintHitsResponse(
      limit,
      page,
      projectId,
      dateRangeQueries,
      reqCtx,
      sprintState
    );

    const sprintData: any = [];
    const sprintIds: any = [];
    await Promise.all(
      sprintHits.map(async (item: Other.Type.HitBody) => {
        sprintData.push({
          id: item.id,
          sprintId: item.sprintId,
          name: item.name,
          status: item.state,
          startDate: item.startDate,
          endDate: item.endDate,
        });
        sprintIds.push(item.id);
      })
    );

    const estimateActualGraph = await estimateActualGraphResponse(
      sortKey,
      sortOrder,
      sprintIds,
      reqCtx
    );
    const issueWithZeroEstimate = await countIssuesWithZeroEstimates(sprintIds, reqCtx);
    const bugTime: [{ sprintId: string; bugTime: number }] = (await Promise.all(
      sprintIds.map(async (sprintId: string) => {
        const bugTimeForSprint = await getBugTimeForSprint(sprintId, reqCtx);
        return { sprintId, bugTime: bugTimeForSprint.actual.value };
      })
    )) as [{ sprintId: string; bugTime: number }];

    const sprintEstimate = sprintEstimateResponse(
      sprintData,
      estimateActualGraph,
      bugTime,
      issueWithZeroEstimate,
      orgName,
      projectKey
    );
    return {
      data: sprintEstimate,
      totalPages,
      page,
    };
  } catch (e) {
    throw new Error(`error_occurred_sprint_variance: ${e}`);
  }
}

/**
 * Creates a search query for retrieving sprints based on the specified project ID and date range queries.
 *
 * @param projectId - The ID of the project.
 * @param dateRangeQueries - An array of date range queries.
 * @returns The search query for retrieving sprints.
 */
export function createSprintQuery(
  projectId: string,
  dateRangeQueries: esb.RangeQuery[],
  sprintState?: Jira.Enums.SprintState
): RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.isDeleted', false),
          esb.boolQuery().should(dateRangeQueries).minimumShouldMatch(1),
          esb
            .boolQuery()
            .must(
              sprintState
                ? esb.termQuery('body.state', sprintState)
                : esb.termsQuery('body.state', [
                    Jira.Enums.SprintState.CLOSED,
                    Jira.Enums.SprintState.ACTIVE,
                  ])
            ),
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
async function ftpRateGraphResponse(
  sprintIdsArr: string[],
  reqCtx: Other.Type.RequestCtx
): Promise<{
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
  logger.info({ ...reqCtx, message: 'issue_for_sprints_query', data: { query } });

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
  endDate: string,
  reqCtx: Other.Type.RequestCtx,
  sprintState: Jira.Enums.SprintState
): Promise<number> {
  const sprintIdsArr = [];
  try {
    const dateRangeQueries = getDateRangeQueries(startDate, endDate);
    const sprintQuery = createSprintQuery(projectId, dateRangeQueries, sprintState);

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

    const ftpRateGraph = await ftpRateGraphResponse(sprintIdsArr, reqCtx);
    return parseFloat(
      (ftpRateGraph.estimatedTime.value === 0
        ? 0
        : ((ftpRateGraph.actualTime.value - ftpRateGraph.estimatedTime.value) * 100) /
          ftpRateGraph.estimatedTime.value
      ).toFixed(2)
    );
  } catch (e) {
    throw new Error(`error_occurred_sprint_variance_avg: ${e}`);
  }
}
