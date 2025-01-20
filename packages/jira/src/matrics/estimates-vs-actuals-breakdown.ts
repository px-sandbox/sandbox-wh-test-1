/* eslint-disable no-await-in-loop */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb, { RequestBodySearch } from 'elastic-builder';
import _ from 'lodash';
import { searchedDataFormator } from '../util/response-formatter';
import { IssuesTypes } from 'abstraction/jira/enums';
import { getBugIssueLinksKeys } from './get-sprint-variance';
import { logger } from 'core';
import { Hit } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Creates a search query to retrieve issues based on the provided parameters.
 *
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param orgId - The ID of the organization.
 * @returns The search query as a RequestBodySearch object.
 */
function createIssueSearchQuery(
  projectId: string,
  sprintId: string,
  orgId: string
): RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.sprintId', sprintId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termsQuery('body.issueType', [IssuesTypes.STORY, IssuesTypes.TASK, IssuesTypes.BUG]),
          esb.existsQuery('body.timeTracker'),
        ])
        .mustNot(
          esb
            .boolQuery()
            .must([
              esb.termQuery('body.issueType', IssuesTypes.BUG),
              esb.existsQuery('body.issueLinks'),
            ])
        )
    )
    .sort(esb.sort('_id'))
    .size(100)
    .source([
      'body.id',
      'body.issueKey',
      'body.timeTracker',
      'body.subtasks',
      'body.summary',
      'body.issueType',
      'body.issueLinks',
    ]);
}

/**
 * Creates a search query for retrieving subtasks based on the provided parameters.
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param orgId - The ID of the organization.
 * @returns The search query as a RequestBodySearch object.
 */
function createSubtaskSearchQuery(
  projectId: string,
  sprintId: string,
  orgId: string
): RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.sprintId', sprintId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termQuery('body.issueType', 'Sub-task'),
          esb.rangeQuery('body.timeTracker.estimate').gt(0),
        ])
        .must(esb.existsQuery('body.timeTracker'))
    )
    .sort(esb.sort('_id'))
    .size(100)
    .source(['body.id', 'body.issueKey', 'body.timeTracker', 'body.summary', 'body.issueType']);
}

async function getBugTimeForIssues(
  issueKeys: string[]
): Promise<[] | (Pick<Hit, '_id'> & HitBody)[]> {
  // const issueKeys = getBugIssueLinksKeys(formattedIssues.issueLinks);

  //sum aggregate the time spent on bugs for the given issueKeys
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
    .source(['body.id', 'body.issueKey', 'body.timeTracker'])
    .toJSON();

  const result = await esClientObj.search(Jira.Enums.IndexName.Issue, bugQuery);
  return await searchedDataFormator(result);
}
/**
 * Fetches issue data from Jira based on the provided parameters.
 *
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to an object containing the fetched issues and subtasks.
 */
const fetchIssueData = async (
  projectId: string,
  sprintId: string,
  orgId: string
): Promise<{
  issues: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
  subtasks: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
}> => {
  const issueQuery = createIssueSearchQuery(projectId, sprintId, orgId);

  let unformattedIssues: Other.Type.HitBody = await esClientObj.search(
    Jira.Enums.IndexName.Issue,
    issueQuery.toJSON()
  );
  let formattedIssues = await searchedDataFormator(unformattedIssues);

  const issues = [];
  issues.push(...formattedIssues);

  while (formattedIssues?.length > 0) {
    const lastHit = unformattedIssues?.hits?.hits[unformattedIssues.hits.hits.length - 1];
    const query = issueQuery.searchAfter([lastHit.sort[0]]).toJSON();
    unformattedIssues = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
    formattedIssues = await searchedDataFormator(unformattedIssues);
    issues.push(...formattedIssues);
  }
  const subtaskQuery = createSubtaskSearchQuery(projectId, sprintId, orgId);

  let unformattedSubtasks: Other.Type.HitBody = await esClientObj.search(
    Jira.Enums.IndexName.Issue,
    subtaskQuery.toJSON()
  );

  let formattedSubtasks = await searchedDataFormator(unformattedSubtasks);

  const subtasks = [];
  subtasks.push(...formattedSubtasks);
  while (formattedSubtasks.length > 0) {
    const lastHit = unformattedSubtasks.hits.hits[unformattedSubtasks.hits.hits.length - 1];
    const query = subtaskQuery.searchAfter([lastHit.sort[0]]).toJSON();
    unformattedSubtasks = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
    formattedSubtasks = await searchedDataFormator(unformattedSubtasks);
    subtasks.push(...formattedSubtasks);
  }

  return { issues, subtasks };
};

/**
 * Calculates the estimates vs actuals breakdown for a given project and sprint.
 *
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param sortKey - The key to sort the breakdown by.
 * @param sortOrder - The order to sort the breakdown in ('asc' or 'desc').
 * @param orgId - The ID of the organization.
 * @param orgname - The name of the organization.
 * @returns A promise that resolves to an array of EstimatesVsActualsBreakdownResponse objects.
 * @throws An error if there is an issue fetching the issue data or calculating the breakdown.
 */
export const estimatesVsActualsBreakdown = async (
  projectId: string,
  sprintId: string,
  sortKey: string,
  sortOrder: string,
  orgId: string,
  orgname: string
): Promise<Jira.Type.EstimatesVsActualsBreakdownResponse[]> => {
  try {
    const { issues, subtasks } = await fetchIssueData(projectId, sprintId, orgId);
    const parentBugMapping = issues.reduce((acc: Record<string, string[]>, ele) => {
      if (ele.issueLinks) {
        acc[ele.issueKey] = getBugIssueLinksKeys(ele.issueLinks);
      }
      return acc;
    }, {});
    logger.info({ message: 'parentBugMapping', data: parentBugMapping });
    const bugTime = await getBugTimeForIssues(Object.values(parentBugMapping).join(',').split(','));
    const response = await Promise.all(
      issues?.map(async (issue) => {
        const estimate = issue?.timeTracker?.estimate ?? 0;
        const actual = issue?.timeTracker?.actual ?? 0;
        let overallEstimate = estimate;
        let overallActual = estimate ? actual : 0;
        const bugTimeForIssue = parentBugMapping[issue.issueKey];
        const bugTimeForIssueActual = bugTime
          .filter((ele) => bugTimeForIssue.includes(ele.issueKey))
          .reduce((acc, curr) => acc + curr.timeTracker.actual, 0);
        const subtasksArr: {
          id: string;
          issueKey: string;
          title: string;
          estimate: number;
          actual: number;
          variance: number;
          link: string;
          issueType: string;
          totalTime: number;
        }[] = [];

        const keys = issue.subtasks?.map((ele: { key: string }) => ele?.key);

        subtasks?.forEach((subtask) => {
          if (keys?.includes(subtask?.issueKey)) {
            const subEstimate = subtask?.timeTracker?.estimate ?? 0;
            const subActual = subtask?.timeTracker?.actual ?? 0;
            overallEstimate += subEstimate;
            overallActual += subActual;

            subtasksArr.push({
              id: subtask?.id,
              issueKey: subtask?.issueKey,
              title: subtask?.summary,
              estimate: subEstimate,
              actual: subActual,
              issueType: subtask?.issueType,
              variance: parseFloat((((subActual - subEstimate) / subEstimate) * 100).toFixed(2)),
              link: `https://${orgname}.atlassian.net/browse/${subtask?.issueKey}`,
              totalTime: subActual ?? 0,
            });
          }
        });

        return {
          id: issue?.id,
          issueKey: issue?.issueKey,
          title: issue?.summary,
          estimate,
          actual,
          issueType: issue?.issueType,
          variance: parseFloat((((actual - estimate) / estimate) * 100).toFixed(2)),
          overallEstimate,
          overallActual,
          overallVariance: parseFloat(
            (((overallActual - overallEstimate) / overallEstimate) * 100).toFixed(2)
          ),
          bugTime: bugTimeForIssueActual,
          hasSubtasks: subtasksArr?.length > 0,
          link: `https://${orgname}.atlassian.net/browse/${issue?.issueKey}`,
          subtasks: subtasksArr,
          totalTime: actual + bugTimeForIssueActual,
        };
      })
    );
    const filteredResp = response?.filter((ele) => ele?.overallEstimate !== 0);
    const data = _.orderBy(filteredResp, [sortKey], [sortOrder as 'asc' | 'desc']);

    return data;
  } catch (e) {
    throw new Error(`estimates-vs-actuals-breakdown-error: ${e}`);
  }
};
