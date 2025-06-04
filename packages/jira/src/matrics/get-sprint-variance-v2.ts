/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { IssueLinked, IssuesTypes } from 'abstraction/jira/enums';
import {
  BucketItem,
  BugTimeInfo,
  SprintVariance,
  SprintVarianceData,
  TaskItem,
} from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { RequestBodySearch } from 'elastic-builder';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { getOrganizationById } from '../repository/organization/get-organization';
import { searchedDataFormator, searchedDataFormatorWithDeleted } from '../util/response-formatter';
import { calculateBugTimeInfo } from './estimates-vs-actuals-breakdown-v2';

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

function getJiraLinkForVersion(
  orgName: string,
  projectKey: string,
  versionId: string,
  isOgEstimate = false
): string {
  const versionIdWithoutPrefix = versionId.replace('jira_version_', '');
  const baseUrl = `https://${orgName}.atlassian.net/jira/software/c/projects/${projectKey}/issues/?jql=
  project = "${projectKey}" and fixVersion = ${versionIdWithoutPrefix}`;
  const query = isOgEstimate
    ? 'AND OriginalEstimate IS EMPTY'
    : 'AND TimeSpent IS EMPTY AND OriginalEstimate != EMPTY';
  const orderBy = 'AND type != Test ORDER BY created DESC';
  return encodeURI(`${baseUrl} ${query} ${orderBy}`);
}

export async function sprintHitsResponse(
  limit: number,
  page: number,
  projectId: string,
  dateRangeQueries: esb.RangeQuery[],
  reqCtx: Other.Type.RequestCtx,
  state: string
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
          esb.termsQuery('body.state', state.split(',')),
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

export function getDatesForVersion(
  startDate: string,
  endDate?: string
): {
  dateRangeQueries: esb.RangeQuery[];
  startDateQuery: esb.RangeQuery;
  releaseDateQuery: esb.RangeQuery;
} {
  let dateRangeQueries = [
    esb.rangeQuery('body.startDate').gte(startDate),
    esb.rangeQuery('body.releaseDate').gte(startDate),
  ];

  if (endDate) {
    dateRangeQueries = [
      esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
      esb.rangeQuery('body.releaseDate').gte(startDate).lte(endDate),
    ];
  }
  let startDateQuery = esb.rangeQuery('body.startDate').gte(startDate);
  if (endDate) {
    startDateQuery = esb.rangeQuery('body.startDate').gte(startDate).lte(endDate);
  }
  let releaseDateQuery = esb.rangeQuery('body.releaseDate').gte(startDate);
  if (endDate) {
    releaseDateQuery = esb.rangeQuery('body.releaseDate').gte(startDate).lte(endDate);
  }
  return { dateRangeQueries, startDateQuery, releaseDateQuery };
}

export async function versionHitsResponse(
  limit: number,
  page: number,
  projectId: string,
  startDate: string,
  reqCtx: Other.Type.RequestCtx,
  versionState: string,
  endDate?: string
): Promise<{
  versionHits: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
  totalPages: number;
}> {
  const { dateRangeQueries, startDateQuery, releaseDateQuery } = getDatesForVersion(
    startDate,
    endDate
  );
  const versionQuery = esb
    .requestBodySearch()
    .size(limit)
    .from((page - 1) * limit)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.status', versionState.split(',')),
        ])
        .should([
          esb
            .boolQuery()
            .must([
              esb.existsQuery('body.releaseDate'),
              esb.existsQuery('body.startDate'),
              esb.boolQuery().should(dateRangeQueries).minimumShouldMatch(1),
            ]),
          esb
            .boolQuery()
            .must([
              esb.existsQuery('body.startDate'),
              esb.boolQuery().mustNot(esb.existsQuery('body.releaseDate')),
              esb.boolQuery().should(startDateQuery).minimumShouldMatch(1),
            ]),
          esb
            .boolQuery()
            .must([
              esb.existsQuery('body.releaseDate'),
              esb.boolQuery().mustNot(esb.existsQuery('body.startDate')),
              esb.boolQuery().should(releaseDateQuery).minimumShouldMatch(1),
            ]),
          esb
            .boolQuery()
            .must([
              esb.boolQuery().mustNot(esb.existsQuery('body.releaseDate')),
              esb.boolQuery().mustNot(esb.existsQuery('body.startDate')),
            ]),
        ])
        .minimumShouldMatch(1)
    )
    .sort(esb.sort('body.status', 'asc'))
    .sort(esb.sort('body.releaseDate', 'desc'))
    .toJSON();

  logger.info({ ...reqCtx, message: 'versionQuery', data: { versionQuery } });
  const body = (await esClientObj.search(
    Jira.Enums.IndexName.Version,
    versionQuery
  )) as Other.Type.HitBody;
  return {
    versionHits: await searchedDataFormatorWithDeleted(body),
    totalPages: Math.ceil(body.hits.total.value / limit),
  };
}

async function getStoriesAndTasksWithEstimates(
  sprintId: string,
  versionIds: string,
  reqCtx: Other.Type.RequestCtx,
  type: Jira.Enums.JiraFilterType
): Promise<string[]> {
  const query = esb
    .requestBodySearch()
    .size(1000)
    .query(
      esb
        .boolQuery()
        .must([
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termQuery('body.sprintId', sprintId)
            : esb.termsQuery('body.fixVersion', versionIds),
          esb.termQuery('body.isDeleted', false),
        ])
        .should([
          esb.termQuery('body.issueType', IssuesTypes.STORY),
          esb.termQuery('body.issueType', IssuesTypes.TASK),
          esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  logger.info({ ...reqCtx, message: 'stories_tasks_query', data: { query } });

  const res = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
  const issueData = await searchedDataFormator(res);

  // Create mapping for task and its subtask using parent key in subtask
  const taskSubtaskMapping: Record<string, TaskItem> = {};
  (issueData as unknown as TaskItem[]).forEach((item) => {
    if ([IssuesTypes.TASK, IssuesTypes.STORY].includes(item.issueType as IssuesTypes)) {
      taskSubtaskMapping[item.issueKey] = item;
    }
  });

  // Add subtask to task with parent mapping
  (issueData as unknown as TaskItem[]).forEach((item) => {
    const parentKey = item.parent?.key;
    if (item.issueType === IssuesTypes.SUBTASK && parentKey && taskSubtaskMapping[parentKey]) {
      const parentTask = taskSubtaskMapping[parentKey];
      if (!parentTask.embeddedSubtasks) {
        parentTask.embeddedSubtasks = [];
      }
      parentTask.embeddedSubtasks.push(item);
    }
  });

  // Get valid story and task keys
  const validStoryTaskKeys = Object.values(taskSubtaskMapping)
    .filter(
      (task) =>
        (task.timeTracker?.estimate ?? 0) > 0 ||
        (task.embeddedSubtasks &&
          task.embeddedSubtasks.some((subtask) => (subtask.timeTracker?.estimate ?? 0) > 0))
    )
    .map((item) => item.issueKey);

  // Get valid subtask keys (only those with estimates > 0)
  const validSubtaskKeys = (issueData as unknown as TaskItem[])
    .filter(
      (item) => item.issueType === IssuesTypes.SUBTASK && (item.timeTracker?.estimate ?? 0) > 0
    )
    .map((item) => item.issueKey);

  // Get valid bug keys (bugs without issue links and with estimates > 0)
  const validBugKeys = (issueData as unknown as TaskItem[])
    .filter(
      (item) =>
        item.issueType === IssuesTypes.BUG &&
        !item.issueLinks?.length &&
        (item.timeTracker?.estimate ?? 0) > 0
    )
    .map((item) => item.issueKey);

  return [...validStoryTaskKeys, ...validSubtaskKeys, ...validBugKeys];
}

async function estimateActualGraphResponse(
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: 'desc' | 'asc',
  reqCtx: Other.Type.RequestCtx,
  type: Jira.Enums.JiraFilterType,
  sprintIds: string[],
  versionIds: string[]
): Promise<{
  sprint_aggregation: { buckets: BucketItem[] };
  version_aggregation: { buckets: BucketItem[] };
}> {
  // Get all valid story and task keys that have estimates
  const validIssueKeys = await Promise.all(
    type === Jira.Enums.JiraFilterType.SPRINT
      ? sprintIds.map((sprintId) => getStoriesAndTasksWithEstimates(sprintId, '', reqCtx, type))
      : versionIds.map((versionId) => getStoriesAndTasksWithEstimates('', versionId, reqCtx, type))
  );
  const query = esb
    .requestBodySearch()
    .size(0)
    .agg(
      type === Jira.Enums.JiraFilterType.SPRINT
        ? esb
            .termsAggregation('sprint_aggregation', 'body.sprintId')
            .order(sortKey, sortOrder)
            .size(10)
            .aggs([
              esb.sumAggregation('estimate', 'body.timeTracker.estimate'),
              esb.sumAggregation('actual', 'body.timeTracker.actual'),
            ])
        : esb
            .termsAggregation('version_aggregation', 'body.fixVersion')
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
        .must([
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termsQuery('body.sprintId', sprintIds)
            : esb.termsQuery('body.fixVersion', versionIds),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.issueKey', validIssueKeys.flat()),
        ])
    )
    .toJSON() as { query: object };
  logger.info({ ...reqCtx, message: 'issue_sprint_query', data: { query } });

  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
}

async function getWorkItemsData(
  type: Jira.Enums.JiraFilterType,
  reqCtx: Other.Type.RequestCtx,
  sprintIds: string[],
  versionIds?: string[]
): Promise<{
  sprintVersions: {
    buckets: Array<{
      key: string;
      doc_count: number;
      issue_types: {
        buckets: Jira.Type.BucketItem[];
      };
    }>;
  };
}> {
  // First get all valid issue keys using the same logic as getStoriesAndTasksWithEstimates
  const validIssueKeys = await Promise.all(
    type === Jira.Enums.JiraFilterType.SPRINT
      ? sprintIds.map((sprintId) => getStoriesAndTasksWithEstimates(sprintId, '', reqCtx, type))
      : versionIds?.map((versionId) =>
          getStoriesAndTasksWithEstimates('', versionId, reqCtx, type)
        ) ?? []
  );

  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb.boolQuery().must([
        esb.termsQuery('body.issueType', [IssuesTypes.TASK, IssuesTypes.STORY, IssuesTypes.BUG]),
        esb.termQuery('body.isDeleted', false),
        type === Jira.Enums.JiraFilterType.SPRINT
          ? esb.termsQuery('body.sprintId', sprintIds)
          : esb.termsQuery('body.fixVersion', versionIds),
        esb.termsQuery('body.issueKey', validIssueKeys.flat()),
        esb
          .boolQuery()
          .should([
            esb.termsQuery('body.issueType', [IssuesTypes.TASK, IssuesTypes.STORY]),
            esb
              .boolQuery()
              .must(esb.termQuery('body.issueType', IssuesTypes.BUG))
              .mustNot(esb.existsQuery('body.issueLinks')),
          ])
          .minimumShouldMatch(1),
      ])
    )
    .agg(
      type === Jira.Enums.JiraFilterType.SPRINT
        ? esb
            .termsAggregation('sprintVersions', 'body.sprintId')
            .size(sprintIds.length)
            .agg(esb.termsAggregation('issue_types', 'body.issueType'))
        : esb
            .termsAggregation('sprintVersions', 'body.fixVersion')
            .size(versionIds?.length ?? 0)
            .agg(esb.termsAggregation('issue_types', 'body.issueType'))
    )
    .toJSON() as { query: object };

  logger.info({ ...reqCtx, message: 'work_items_query', data: { query } });
  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
}

async function countIssuesWithZeroEstimates(
  reqCtx: Other.Type.RequestCtx,
  type: Jira.Enums.JiraFilterType,
  sprintIds: string[],
  versionIds: string[]
): Promise<{
  sprint_aggregation: {
    buckets: Jira.Type.BucketItem[];
  };
  version_aggregation: {
    buckets: Jira.Type.BucketItem[];
  };
}> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .agg(
      type === Jira.Enums.JiraFilterType.SPRINT
        ? esb.termsAggregation('sprint_aggregation', 'body.sprintId')
        : esb.termsAggregation('version_aggregation', 'body.fixVersion')
    )
    .query(
      esb
        .boolQuery()
        .must([
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termsQuery('body.sprintId', sprintIds)
            : esb.termsQuery('body.fixVersion', versionIds),
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

interface SprintData {
  id: string;
  sprintId: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface VersionData {
  id: string;
  name: string;
  status: string;
  startDate: string;
  releaseDate: string;
  endDate: string;
}

function calculateWorkItems(
  workItems: { key: string; doc_count: number; issue_types: { buckets: BucketItem[] } } | undefined
): { task: number; story: number; bug: number; total: number } {
  return {
    task:
      workItems?.issue_types.buckets.find(
        (bucketItem: BucketItem) => bucketItem.key === IssuesTypes.TASK
      )?.doc_count ?? 0,
    story:
      workItems?.issue_types.buckets.find(
        (bucketItem: BucketItem) => bucketItem.key === IssuesTypes.STORY
      )?.doc_count ?? 0,
    bug:
      workItems?.issue_types.buckets.find(
        (bucketItem: BucketItem) => bucketItem.key === IssuesTypes.BUG
      )?.doc_count ?? 0,
    total: workItems?.doc_count ?? 0,
  };
}

function calculateTimeAndVariance(
  item: BucketItem,
  bugTime: { bugInfo: BugTimeInfo; sprintIdOrVersionId: string } | undefined
): {
  time: { estimate: number; actual: number };
  variance: number;
  totalTime: number;
  totalVariance: number;
} {
  const totalTime = (bugTime?.bugInfo.value ?? 0) + (item.actual.value ?? 0);
  return {
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
    totalTime,
    totalVariance: parseFloat(
      (item.estimate.value === 0
        ? 0
        : ((totalTime - item.estimate.value) * 100) / item.estimate.value
      ).toFixed(2)
    ),
  };
}

function createDefaultSprintResponse(
  sprintDetails: SprintData,
  orgName: string,
  projectKey: string,
  estimateMissingFlagCtr: boolean
): SprintVariance {
  return {
    sprint: sprintDetails,
    time: {
      estimate: 0,
      actual: 0,
    },
    workItems: {
      task: 0,
      story: 0,
      bug: 0,
      total: 0,
    },
    isAllEstimated: estimateMissingFlagCtr,
    jiraInfo: {
      estimateIssueLink: !estimateMissingFlagCtr
        ? getJiraLink(orgName, projectKey, sprintDetails.sprintId, true)
        : '',
      loggedIssueLink: getJiraLink(orgName, projectKey, sprintDetails.sprintId),
    },
    bugTime: {
      value: 0,
      status: IssueLinked.NO_BUGS_LINKED,
      loggedBugsCount: 0,
      unloggedBugsCount: 0,
    },
    variance: 0,
    totalTime: 0,
  };
}

function createDefaultVersionResponse(
  versionDetails: VersionData,
  orgName: string,
  projectKey: string
): SprintVariance {
  return {
    version: versionDetails,
    time: {
      estimate: 0,
      actual: 0,
    },
    workItems: {
      task: 0,
      story: 0,
      bug: 0,
      total: 0,
    },
    isAllEstimated: true,
    jiraInfo: {
      estimateIssueLink: '',
      loggedIssueLink: getJiraLinkForVersion(orgName, projectKey, versionDetails.id),
    },
    bugTime: {
      value: 0,
      status: IssueLinked.NO_BUGS_LINKED,
      loggedBugsCount: 0,
      unloggedBugsCount: 0,
    },
    variance: 0,
    totalTime: 0,
  };
}

function sprintEstimateResponse(
  sprintData: SprintData[],
  estimateActualGraph: {
    sprint_aggregation: {
      buckets: Jira.Type.BucketItem[];
    };
  },
  bugTimeActual: { bugInfo: BugTimeInfo; sprintIdOrVersionId: string }[],
  issueWithZeroEstimate: {
    sprint_aggregation: {
      buckets: Jira.Type.BucketItem[];
    };
  },
  workItemsData: {
    sprintVersions: {
      buckets: Array<{
        key: string;
        doc_count: number;
        issue_types: {
          buckets: BucketItem[];
        };
      }>;
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
      (bugData: { sprintIdOrVersionId: string; bugInfo: BugTimeInfo }) =>
        bugData.sprintIdOrVersionId === sprintDetails.id
    );
    const estimateCount = issueWithZeroEstimate.sprint_aggregation.buckets.find(
      (bucketItem: BucketItem) => bucketItem.key === sprintDetails.id
    );
    if (estimateCount && estimateCount.doc_count > 4) {
      estimateMissingFlagCtr = false;
    }
    const workItems = workItemsData.sprintVersions.buckets.find(
      (bucketItem: { key: string; doc_count: number; issue_types: { buckets: BucketItem[] } }) =>
        bucketItem.key === sprintDetails.id
    );

    if (!item) {
      return createDefaultSprintResponse(
        sprintDetails,
        orgName,
        projectKey,
        estimateMissingFlagCtr
      );
    }

    const { time, variance, totalTime, totalVariance } = calculateTimeAndVariance(item, bugTime);
    const calculatedWorkItems = calculateWorkItems(workItems);

    return {
      sprint: sprintDetails,
      workItems: calculatedWorkItems,
      time,
      isAllEstimated: estimateMissingFlagCtr,
      jiraInfo: {
        estimateIssueLink: !estimateMissingFlagCtr
          ? getJiraLink(orgName, projectKey, sprintDetails.sprintId, true)
          : '',
        loggedIssueLink: getJiraLink(orgName, projectKey, sprintDetails.sprintId),
      },
      variance,
      bugTime: bugTime?.bugInfo,
      totalTime,
      totalVariance,
    };
  });
}

function versionEstimateResponse(
  versionData: VersionData[],
  estimateActualGraph: {
    version_aggregation: {
      buckets: Jira.Type.BucketItem[];
    };
  },
  bugTimeActual: { bugInfo: BugTimeInfo; sprintIdOrVersionId: string }[],
  issueWithZeroEstimate: {
    version_aggregation: {
      buckets: Jira.Type.BucketItem[];
    };
  },
  workItemsData: {
    sprintVersions: {
      buckets: Array<{
        key: string;
        doc_count: number;
        issue_types: {
          buckets: BucketItem[];
        };
      }>;
    };
  },
  orgName: string,
  projectKey: string
): SprintVariance[] {
  return versionData.map((versionDetails) => {
    let estimateMissingFlagCtr = true;
    const item = estimateActualGraph.version_aggregation.buckets.find(
      (bucketItem: BucketItem) => bucketItem.key === versionDetails.id
    );
    const bugTime = bugTimeActual.find(
      (bugData: { sprintIdOrVersionId: string; bugInfo: BugTimeInfo }) =>
        bugData.sprintIdOrVersionId === versionDetails.id
    );
    const estimateCount = issueWithZeroEstimate.version_aggregation.buckets.find(
      (bucketItem: BucketItem) => bucketItem.key === versionDetails.id
    );
    if (estimateCount && estimateCount.doc_count > 4) {
      estimateMissingFlagCtr = false;
    }
    const workItems = workItemsData.sprintVersions.buckets.find(
      (bucketItem: { key: string; doc_count: number; issue_types: { buckets: BucketItem[] } }) =>
        bucketItem.key === versionDetails.id
    );

    if (!item) {
      return createDefaultVersionResponse(versionDetails, orgName, projectKey);
    }

    const { time, variance, totalTime, totalVariance } = calculateTimeAndVariance(item, bugTime);
    const calculatedWorkItems = calculateWorkItems(workItems);

    return {
      version: versionDetails,
      workItems: calculatedWorkItems,
      time,
      isAllEstimated: estimateMissingFlagCtr,
      jiraInfo: {
        estimateIssueLink: !estimateMissingFlagCtr
          ? getJiraLinkForVersion(orgName, projectKey, versionDetails.id, true)
          : '',
        loggedIssueLink: getJiraLinkForVersion(orgName, projectKey, versionDetails.id),
      },
      variance,
      bugTime: bugTime?.bugInfo,
      totalTime,
      totalVariance,
    };
  });
}

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
  const bugKeys = [];
  for (const link of issueLinks) {
    if (link.type === Jira.Enums.IssuesTypes.BUG) {
      bugKeys.push(link.key);
    }
  }
  return bugKeys;
}

async function getBugTimeForSprint(
  sprintId: string,
  versionIds: string,
  reqCtx: Other.Type.RequestCtx,
  type: Jira.Enums.JiraFilterType,
  orgName: string
): Promise<{ bugInfo: BugTimeInfo; sprintIdOrVersionId: string }> {
  const query = esb
    .requestBodySearch()
    .size(1000)
    .query(
      esb
        .boolQuery()
        .must([
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termQuery('body.sprintId', sprintId)
            : esb.termsQuery('body.fixVersion', versionIds),
          esb.termQuery('body.isDeleted', false),
        ])
        .should([
          esb.termQuery('body.issueType', IssuesTypes.STORY),
          esb.termQuery('body.issueType', IssuesTypes.TASK),
          esb.termQuery('body.issueType', IssuesTypes.SUBTASK),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  logger.info({ ...reqCtx, message: 'bug_time_for_sprint_query', data: { query } });

  const res = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
  const issueData = await searchedDataFormator(res);

  // create mapping for task and its subtask using parent key in subtask

  const taskSubtaskMapping: Record<string, TaskItem> = {};
  (issueData as unknown as TaskItem[]).forEach((item) => {
    if ([IssuesTypes.TASK, IssuesTypes.STORY].includes(item.issueType as IssuesTypes)) {
      taskSubtaskMapping[item.issueKey] = item;
    }
  });

  // add subtask to task with parent mapping
  (issueData as unknown as TaskItem[]).forEach((item) => {
    const parentKey = item.parent?.key;
    if (item.issueType === IssuesTypes.SUBTASK && parentKey && taskSubtaskMapping[parentKey]) {
      const parentTask = taskSubtaskMapping[parentKey];
      if (!parentTask.embeddedSubtasks) {
        parentTask.embeddedSubtasks = [];
      }
      parentTask.embeddedSubtasks.push(item);
    }
  });

  // filter out those issue Keys who's estimate is greater than 0
  // or its subtask greater than 0
  const issueKeys = Object.values(taskSubtaskMapping)
    .filter(
      (task) =>
        (task.timeTracker?.estimate ?? 0) > 0 ||
        (task.embeddedSubtasks &&
          task.embeddedSubtasks.some((subtask) => (subtask.timeTracker?.estimate ?? 0) > 0))
    )
    .flatMap((item) =>
      (item.issueLinks || [])
        .filter((link) => link.type === Jira.Enums.IssuesTypes.BUG)
        .map((link) => link.key)
    );

  const bugQuery = esb
    .requestBodySearch()
    .size(issueKeys.length)
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.issueKey', issueKeys), esb.termQuery('body.isDeleted', false)])
        .should([esb.termQuery('body.issueType', IssuesTypes.BUG)])
        .minimumShouldMatch(1)
    )
    .toJSON();

  logger.info({ ...reqCtx, message: 'bug_time_for_sprint_query', data: { bugQuery } });

  const bugTimeData = await esClientObj.search(Jira.Enums.IndexName.Issue, bugQuery);
  const formattedBugTime = await searchedDataFormator(bugTimeData);

  const bugTimeForIssue = formattedBugTime.map((bug) => ({
    issueKey: bug.issueKey,
    timeTracker: {
      actual: bug.timeTracker.actual,
    },
  }));

  const bugInfo = calculateBugTimeInfo(
    bugTimeForIssue,
    `https://${orgName}.atlassian.net`,
    sprintId || versionIds
  );
  return {
    bugInfo: {
      value: bugInfo.value,
      status: bugInfo.status,
      loggedBugsCount: bugInfo.loggedBugsCount,
      unloggedBugsCount: bugInfo.unloggedBugsCount,
    },
    sprintIdOrVersionId: sprintId || versionIds,
  };
}

async function processSprintData(
  limit: number,
  page: number,
  projectId: string,
  dateRangeQueries: esb.RangeQuery[],
  reqCtx: Other.Type.RequestCtx,
  state: string
): Promise<{ sprintData: SprintData[]; sprintIds: string[]; totalPages: number }> {
  const sprintData: SprintData[] = [];
  const sprintIds: string[] = [];
  const { sprintHits, totalPages } = await sprintHitsResponse(
    limit,
    page,
    projectId,
    dateRangeQueries,
    reqCtx,
    state
  );
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
  return { sprintData, sprintIds, totalPages };
}

async function processVersionData(
  limit: number,
  page: number,
  projectId: string,
  startDate: string,
  reqCtx: Other.Type.RequestCtx,
  state: string,
  endDate?: string
): Promise<{ versionData: VersionData[]; versionIds: string[]; totalPages: number }> {
  const versionData: VersionData[] = [];
  const versionIds: string[] = [];
  const { versionHits, totalPages } = await versionHitsResponse(
    limit,
    page,
    projectId,
    startDate,
    reqCtx,
    state,
    endDate
  );
  await Promise.all(
    versionHits.map((item: Other.Type.HitBody) => {
      versionData.push({
        id: item.id,
        name: item.name,
        status: item.status,
        startDate: item.startDate,
        releaseDate: item.releaseDate,
        endDate: item.releaseDate || item.startDate,
      });
      versionIds.push(item.id);
      return item;
    })
  );
  return { versionData, versionIds, totalPages };
}

async function processVersionDataWithEstimates(
  limit: number,
  page: number,
  projectId: string,
  startDate: string,
  reqCtx: Other.Type.RequestCtx,
  state: string,
  sortKey: Jira.Enums.IssueTimeTracker,
  sortOrder: 'asc' | 'desc',
  orgName: string,
  projectKey: string,
  type: Jira.Enums.JiraFilterType,
  endDate?: string
): Promise<{ data: SprintVariance[]; totalPages: number; page: number }> {
  const { versionData, versionIds, totalPages } = await processVersionData(
    limit,
    page,
    projectId,
    startDate,
    reqCtx,
    state,
    endDate
  );
  const estimateActualGraph = await estimateActualGraphResponse(
    sortKey,
    sortOrder,
    reqCtx,
    type,
    [],
    versionIds
  );
  const issueWithZeroEstimate = await countIssuesWithZeroEstimates(reqCtx, type, [], versionIds);

  const bugTime: { bugInfo: BugTimeInfo; sprintIdOrVersionId: string }[] = (await Promise.all(
    versionIds.map(async (versionId: string) => {
      const bugTimeForVersion = await getBugTimeForSprint('', versionId, reqCtx, type, orgName);
      return bugTimeForVersion;
    })
  )) as { bugInfo: BugTimeInfo; sprintIdOrVersionId: string }[];

  const workItemsData = await getWorkItemsData(type, reqCtx, [], versionIds);
  const versionEstimate = versionEstimateResponse(
    versionData,
    estimateActualGraph,
    bugTime,
    issueWithZeroEstimate,
    workItemsData,
    orgName,
    projectKey
  );

  return {
    data: versionEstimate,
    totalPages,
    page,
  };
}

export async function createVersionQuery(
  projectId: string,
  startDate: string,
  state: Jira.Enums.State,
  endDate?: string
): Promise<Search<MultiSearchBody>> {
  const { dateRangeQueries, startDateQuery, releaseDateQuery } = getDatesForVersion(
    startDate,
    endDate
  );
  const query = esb
    .requestBodySearch()
    .size(1000)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.status', state.split(',')),
        ])
        .should([
          esb
            .boolQuery()
            .must([
              esb.existsQuery('body.releaseDate'),
              esb.existsQuery('body.startDate'),
              esb.boolQuery().should(dateRangeQueries).minimumShouldMatch(1),
            ]),
          esb
            .boolQuery()
            .must([
              esb.existsQuery('body.startDate'),
              esb.boolQuery().mustNot(esb.existsQuery('body.releaseDate')),
              esb.boolQuery().should(startDateQuery).minimumShouldMatch(1),
            ]),
          esb
            .boolQuery()
            .must([
              esb.existsQuery('body.releaseDate'),
              esb.boolQuery().mustNot(esb.existsQuery('body.startDate')),
              esb.boolQuery().should(releaseDateQuery).minimumShouldMatch(1),
            ]),
          esb
            .boolQuery()
            .must([
              esb.boolQuery().mustNot(esb.existsQuery('body.releaseDate')),
              esb.boolQuery().mustNot(esb.existsQuery('body.startDate')),
            ]),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  const res = await esClientObj.search(Jira.Enums.IndexName.Version, query);
  return res;
}

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
  state: string,
  type: string
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
    if (type === Jira.Enums.JiraFilterType.SPRINT) {
      const { sprintData, sprintIds, totalPages } = await processSprintData(
        limit,
        page,
        projectId,
        dateRangeQueries,
        reqCtx,
        state
      );

      const estimateActualGraph = await estimateActualGraphResponse(
        sortKey,
        sortOrder,
        reqCtx,
        type,
        sprintIds,
        []
      );
      const issueWithZeroEstimate = await countIssuesWithZeroEstimates(reqCtx, type, sprintIds, []);
      const bugTime: { bugInfo: BugTimeInfo; sprintIdOrVersionId: string }[] = (await Promise.all(
        sprintIds.map(async (sprintId: string) => {
          const bugTimeForSprint = await getBugTimeForSprint(sprintId, '', reqCtx, type, orgName);
          return bugTimeForSprint;
        })
      )) as { bugInfo: BugTimeInfo; sprintIdOrVersionId: string }[];

      const workItemsData = await getWorkItemsData(type, reqCtx, sprintIds);
      const sprintEstimate = sprintEstimateResponse(
        sprintData,
        estimateActualGraph,
        bugTime,
        issueWithZeroEstimate,
        workItemsData,
        orgName,
        projectKey
      );
      return {
        data: sprintEstimate,
        totalPages,
        page,
      };
    }

    if (type === Jira.Enums.JiraFilterType.VERSION) {
      return await processVersionDataWithEstimates(
        limit,
        page,
        projectId,
        startDate,
        reqCtx,
        state,
        sortKey,
        sortOrder,
        orgName,
        projectKey,
        type,
        endDate
      );
    }
    return {
      data: [],
      totalPages: 0,
      page,
    };
  } catch (e) {
    throw new Error(`error_occurred_sprint_variance: ${e}`);
  }
}

export function createSprintQuery(
  projectId: string,
  dateRangeQueries: esb.RangeQuery[],
  state: Jira.Enums.State
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
          esb.boolQuery().must(esb.termsQuery('body.state', state.split(','))),
        ])
    )
    .sort(esb.sort('body.sprintId'));
}

async function estimateAvgResponse(
  ids: string[],
  type: string,
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
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termsQuery('body.sprintId', ids)
            : esb.termsQuery('body.fixVersion', ids),
          esb.termQuery('body.isDeleted', false),
        ])
        .filter(esb.rangeQuery('body.timeTracker.estimate').gte(0))
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
    .toJSON();
  logger.info({ ...reqCtx, message: 'issue_for_sprints_version_avg_query', data: { query } });

  return esClientObj.queryAggs(Jira.Enums.IndexName.Issue, query);
}

async function paginateIds(
  indexName: Jira.Enums.IndexName,
  query: esb.RequestBodySearch
): Promise<string[]> {
  const ids = [];
  let formattedIds = [];
  let lastHit;
  do {
    const searchQuery = query.searchAfter(lastHit);
    const body: Other.Type.HitBody = await esClientObj.search(indexName, searchQuery);
    lastHit = body.hits.hits[body.hits.hits.length - 1]?.sort;
    formattedIds = await searchedDataFormator(body);
    ids.push(...formattedIds.map((id) => id.id));
  } while (formattedIds?.length);
  return ids;
}

async function calculateVariance(
  ids: string[],
  type: string,
  reqCtx: Other.Type.RequestCtx
): Promise<number> {
  const estimateAvg = await estimateAvgResponse(ids, type, reqCtx);
  return parseFloat(
    (estimateAvg.estimatedTime.value === 0
      ? 0
      : ((estimateAvg.actualTime.value - estimateAvg.estimatedTime.value) * 100) /
        estimateAvg.estimatedTime.value
    ).toFixed(2)
  );
}

export async function sprintVarianceGraphAvg(
  projectId: string,
  startDate: string,
  endDate: string,
  reqCtx: Other.Type.RequestCtx,
  type: string,
  state: Jira.Enums.State
): Promise<number> {
  const dateRangeQueries = getDateRangeQueries(startDate, endDate);
  try {
    if (type === Jira.Enums.JiraFilterType.SPRINT) {
      const sprintQuery = createSprintQuery(projectId, dateRangeQueries, state);
      const sprintIdsArr = await paginateIds(Jira.Enums.IndexName.Sprint, sprintQuery);
      logger.info({ ...reqCtx, message: 'sprintIds', data: { sprintIdsArr } });
      return await calculateVariance(sprintIdsArr, type, reqCtx);
    }
    if (type === Jira.Enums.JiraFilterType.VERSION) {
      const versionQuery = await createVersionQuery(projectId, startDate, state, endDate);
      const versionQueryRes = await searchedDataFormator(versionQuery);
      const versionIdsArr = versionQueryRes.map((item) => item.id);
      logger.info({ ...reqCtx, message: 'versionIds', data: { versionIdsArr } });
      return await calculateVariance(versionIdsArr, type, reqCtx);
    }
    return 0;
  } catch (e) {
    throw new Error(`error_occurred_sprint_variance_avg: ${e}`);
  }
}
