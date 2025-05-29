/* eslint-disable no-await-in-loop */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb, { RequestBodySearch } from 'elastic-builder';
import { IssueLinked, IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import { Hit } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { BugTimeInfo } from 'abstraction/jira/type';
import _ from 'lodash';
import { getBugIssueLinksKeys } from './get-sprint-variance';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Calculates bug time information for a given issue
 * @param bugTimeForIssueActual - Array of bug time tracking data
 * @param baseUrl - Base URL for Jira instance
 * @returns BugTimeInfo object containing bug time statistics and status
 */
export const calculateBugTimeInfo = (
  bugTimeForIssueActual: Array<{ issueKey: string; timeTracker: { actual: number } }>,
  baseUrl: string,
  issueKey: string
): BugTimeInfo => {
  const totalBugs = bugTimeForIssueActual.length;

  if (totalBugs === 0) {
    return {
      value: 0,
      status: IssueLinked.NO_BUGS_LINKED,
      loggedBugsCount: 0,
      unloggedBugsCount: 0,
      link: `${baseUrl}/jira/software/c/projects/${
        issueKey.split('-')[0]
      }/issues/?jql=issuetype%20in%20%28Bug%29%20and%20issueLink%20%3D%20%22${issueKey}%22%20`,
    };
  }

  const loggedBugs = bugTimeForIssueActual.filter((bug) => bug.timeTracker.actual > 0);
  const loggedBugsCount = loggedBugs.length;
  const unloggedBugsCount = totalBugs - loggedBugsCount;

  const totalBugTime = bugTimeForIssueActual.reduce(
    (acc, curr) => acc + curr.timeTracker.actual,
    0
  );

  let status: IssueLinked = IssueLinked.NO_BUGS_TIME_LOGGED;
  if (loggedBugsCount === totalBugs) {
    status = IssueLinked.ALL_BUGS_TIME_LOGGED;
  } else if (loggedBugsCount === 0 && unloggedBugsCount > 0) {
    status = IssueLinked.NO_BUGS_TIME_LOGGED;
  } else if (loggedBugsCount > 0 && loggedBugsCount < totalBugs) {
    status = IssueLinked.SOME_BUGS_TIME_LOGGED;
  }

  return {
    value: totalBugTime,
    status,
    loggedBugsCount,
    unloggedBugsCount,
    link: `${baseUrl}/jira/software/c/projects/${
      issueKey.split('-')[0]
    }/issues/?jql=issuetype%20in%20%28Bug%29%20and%20issueLink%20%3D%20%22${issueKey}%22%20`,
  };
};

/**
 * Creates a search query to retrieve issues based on the provided parameters.
 *
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param orgId - The ID of the organization.
 * @returns The search query as a RequestBodySearch object.
 */
function createIssueSearchQueryV2(
  projectId: string,
  orgId: string,
  type: string,
  sprintIdORVersionId?: string
): RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termQuery('body.sprintId', sprintIdORVersionId)
            : esb.termQuery('body.fixVersion', sprintIdORVersionId),
          esb.termQuery('body.isDeleted', false),
          esb.termQuery('body.organizationId', orgId),
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
    .sort(esb.sort('body.issueKey'))
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
function createSubtaskSearchQueryV2(
  projectId: string,
  subtaskIds: string[],
  orgId: string
): RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termsQuery('body.id', subtaskIds),
          esb.termQuery('body.isDeleted', false),
          esb.termQuery('body.organizationId', orgId),
          esb.termQuery('body.issueType', 'Sub-task'),
          esb.rangeQuery('body.timeTracker.estimate').gt(0),
        ])
        .must(esb.existsQuery('body.timeTracker'))
    )
    .sort(esb.sort('body.issueKey'))
    .size(subtaskIds.length)
    .source(['body.id', 'body.issueKey', 'body.timeTracker', 'body.summary', 'body.issueType']);
}

async function getBugTimeForIssuesV2(
  issueKeys: string[]
): Promise<[] | (Pick<Hit, '_id'> & HitBody)[]> {
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
  logger.info({ message: 'bugQuery', data: JSON.stringify(bugQuery) });
  const result = await esClientObj.search(Jira.Enums.IndexName.Issue, bugQuery);
  return searchedDataFormator(result);
}

/**
 * Fetches issue data from Jira based on the provided parameters.
 *
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to an object containing the fetched issues and subtasks.
 */
const fetchIssueDataV2 = async (
  projectId: string,
  orgId: string,
  type: string,
  sprintIdORVersionId?: string
): Promise<{
  issues: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
  subtasks: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
}> => {
  const issues = [];
  const issueQuery = createIssueSearchQueryV2(projectId, orgId, type, sprintIdORVersionId);
  let unformattedIssues: Other.Type.HitBody = await esClientObj.search(
    Jira.Enums.IndexName.Issue,
    issueQuery.toJSON()
  );
  let formattedIssues = await searchedDataFormator(unformattedIssues);

  issues.push(...formattedIssues);

  while (formattedIssues?.length > 0) {
    const lastHit = unformattedIssues?.hits?.hits[unformattedIssues.hits.hits.length - 1];
    const query = issueQuery.searchAfter([lastHit.sort[0]]).toJSON();
    unformattedIssues = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
    formattedIssues = await searchedDataFormator(unformattedIssues);
    issues.push(...formattedIssues);
  }
  const subtaskKeys = issues.reduce((acc: string[], ele) => {
    if (ele.subtasks) {
      acc.push(...ele.subtasks.map((subtask: { id: string }) => subtask.id));
    }
    return acc;
  }, []);

  const subtaskQuery = createSubtaskSearchQueryV2(projectId, subtaskKeys, orgId);

  const unformattedSubtasks: Other.Type.HitBody = await esClientObj.search(
    Jira.Enums.IndexName.Issue,
    subtaskQuery.toJSON()
  );

  const subtasks = await searchedDataFormator(unformattedSubtasks);

  return { issues, subtasks };
};

/**
 * Calculates the estimates vs actuals breakdown for a given project and sprint.
 *
 * @param projectId - The ID of the project.
 * @param sprintId - The ID of the sprint.
 * @param orgId - The ID of the organization.
 * @param orgname - The name of the organization.
 * @returns A promise that resolves to an array of EstimatesVsActualsBreakdownResponse objects.
 * @throws An error if there is an issue fetching the issue data or calculating the breakdown.
 */
export const estimatesVsActualsBreakdownV2 = async (
  projectId: string,
  orgId: string,
  orgname: string,
  type: string,
  sprintIdORVersionId?: string
): Promise<Jira.Type.EstimatesVsActualsBreakdownResponse[]> => {
  let bugTimeInfo: BugTimeInfo;
  try {
    const { issues, subtasks } = await fetchIssueDataV2(
      projectId,
      orgId,
      type,
      sprintIdORVersionId
    );
    const parentBugMapping = issues.reduce((acc: Record<string, string[]>, ele) => {
      if (ele.issueLinks) {
        acc[ele.issueKey] = getBugIssueLinksKeys(ele.issueLinks);
      }
      return acc;
    }, {});
    logger.info({ message: 'parentBugMapping', data: parentBugMapping });
    const bugTime = await getBugTimeForIssuesV2(
      Object.values(parentBugMapping).join(',').split(',')
    );
    const response = await Promise.all(
      issues?.map(async (issue) => {
        const estimate = issue?.timeTracker?.estimate ?? 0;
        const actual = issue?.timeTracker?.actual ?? 0;
        let overallEstimate = estimate;
        let overallActual = actual;
        if (parentBugMapping[issue.issueKey]) {
          const bugTimeForIssue = parentBugMapping[issue.issueKey];
          const filteredBugTime = bugTime
            .filter((ele) => bugTimeForIssue.includes(ele.issueKey))
            .map((bug) => ({
              issueKey: bug.issueKey,
              timeTracker: {
                actual: bug.timeTracker.actual,
              },
            }));

          bugTimeInfo = calculateBugTimeInfo(
            filteredBugTime,
            `https://${orgname}.atlassian.net`,
            issue.issueKey
          );
        }
        const subtasksArr: {
          id: string;
          issueKey: string;
          title: string;
          estimate: number;
          actual: number;
          variance: number;
          totalVariance: number;
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
              totalVariance: parseFloat(
                (((subActual - subEstimate) / subEstimate) * 100).toFixed(2)
              ),
              link: `https://${orgname}.atlassian.net/browse/${subtask?.issueKey}`,
              totalTime: subActual ?? 0,
            });
          }
        });
        subtasksArr.sort((a, b) => {
          const aKey = a.issueKey.split('-')[1];
          const bKey = b.issueKey.split('-')[1];
          return parseInt(aKey, 10) - parseInt(bKey, 10);
        });
        const totalTime = overallActual + (bugTimeInfo?.value ?? 0);
        return {
          id: issue?.id,
          issueKey: issue?.issueKey,
          title: issue?.summary,
          estimate,
          actual,
          issueType: issue?.issueType,
          variance: parseFloat((((actual - estimate) / estimate) * 100).toFixed(2)),
          link: `https://${orgname}.atlassian.net/browse/${issue?.issueKey}`,
          totalTime,
          subtasks: subtasksArr,
          overallEstimate,
          overallActual,
          bugTime: bugTimeInfo,
          overallVariance: parseFloat(
            (((overallActual - overallEstimate) / overallEstimate) * 100).toFixed(2)
          ),
          hasSubtasks: subtasksArr.length > 0,
          totalVariance: (estimate === 0 ? 0 : ((totalTime - estimate) * 100) / estimate).toFixed(
            2
          ),
          overallTotalVariance: (overallEstimate === 0
            ? 0
            : ((totalTime - overallEstimate) * 100) / overallEstimate
          ).toFixed(2),
        };
      })
    );

    const filteredResp = response?.filter((ele) => ele?.overallEstimate !== 0);
    const finalResp = _.sortBy(filteredResp, (item) => parseInt(item.issueKey.split('-')[1], 10));
    return finalResp;
  } catch (error) {
    logger.error({ message: 'Error in estimatesVsActualsBreakdownV2', error });
    throw error;
  }
};
