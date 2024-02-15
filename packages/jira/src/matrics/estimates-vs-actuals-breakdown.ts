/* eslint-disable no-await-in-loop */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Jira, Other } from 'abstraction';
import { Config } from 'sst/node/config';
import _ from 'lodash';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});

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
  const issueQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.sprintId', sprintId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termsQuery('body.issueType', ['Story', 'Bug', 'Task']),
        ])
        .must(esb.existsQuery('body.timeTracker'))
    )
    .sort(esb.sort('_id'))
    .size(100)
    .source(['body.id', 'body.issueKey', 'body.timeTracker', 'body.subtasks']);

  let unformattedIssues: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
    Jira.Enums.IndexName.Issue,
    issueQuery.toJSON()
  );
  let formattedIssues = await searchedDataFormator(unformattedIssues);

  const issues = [];
  issues.push(...formattedIssues);

  while (formattedIssues?.length > 0) {
    const lastHit = unformattedIssues?.hits?.hits[unformattedIssues.hits.hits.length - 1];
    const query = issueQuery.searchAfter([lastHit.sort[0]]).toJSON();
    unformattedIssues = await esClientObj.esbRequestBodySearch(Jira.Enums.IndexName.Issue, query);
    formattedIssues = await searchedDataFormator(unformattedIssues);
    issues.push(...formattedIssues);
  }

  const subtaskQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.sprintId', sprintId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termQuery('body.issueType', 'Sub-task'),
        ])
        .must(esb.existsQuery('body.timeTracker'))
    )
    .sort(esb.sort('_id'))
    .size(100)
    .source(['body.id', 'body.issueKey', 'body.timeTracker']);

  let unformattedSubtasks: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
    Jira.Enums.IndexName.Issue,
    subtaskQuery.toJSON()
  );

  let formattedSubtasks = await searchedDataFormator(unformattedSubtasks);

  const subtasks = [];
  subtasks.push(...formattedSubtasks);
  while (formattedSubtasks.length > 0) {
    const lastHit = unformattedSubtasks.hits.hits[unformattedSubtasks.hits.hits.length - 1];
    const query = subtaskQuery.searchAfter([lastHit.sort[0]]).toJSON();
    unformattedSubtasks = await esClientObj.esbRequestBodySearch(Jira.Enums.IndexName.Issue, query);
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

    const response = await Promise.all(
      issues?.map(async (issue) => {
        const estimate = issue?.timeTracker?.estimate ?? 0;
        const actual = issue?.timeTracker?.actual ?? 0;
        let overallEstimate = estimate;
        let overallActual = actual;

        const subtasksArr: {
          id: string;
          estimate: number;
          actual: number;
          variance: number;
          link: string;
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
              estimate: subEstimate,
              actual: subActual,
              variance: parseFloat((((subActual - subEstimate) / subEstimate) * 100).toFixed(2)),
              link: `https://${orgname}.atlassian.net/browse/${subtask?.issueKey}`,
            });
          }
        });

        return {
          id: issue?.id,
          estimate,
          actual,
          variance: parseFloat((((actual - estimate) / estimate) * 100).toFixed(2)),
          overallEstimate,
          overallActual,
          overallVariance: parseFloat(
            (((overallActual - overallEstimate) / overallEstimate) * 100).toFixed(2)
          ),
          hasSubtasks: subtasksArr?.length > 0,
          link: `https://${orgname}.atlassian.net/browse/${issue?.issueKey}`,
          subtasks: subtasksArr,
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
