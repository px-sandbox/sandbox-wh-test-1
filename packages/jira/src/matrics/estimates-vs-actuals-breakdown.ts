/* eslint-disable no-await-in-loop */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Jira, Other } from 'abstraction';
import { Config } from 'sst/node/config';
import _ from 'lodash';
import { paginate } from '../util/pagination';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});

const fetchIssueData = async (
  projectId: string,
  sprintId: string,
  orgId: string
): Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> => {
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
    )
    .sort(esb.sort('_id'))
    .size(1000)
    .source([
      'body.id',
      'body.projectKey',
      'body.issueKey',
      'body.boardId',
      'body.timeTracker',
      'body.subtasks',
    ]);
  let unformattedData: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
    Jira.Enums.IndexName.Issue,
    issueQuery.toJSON()
  );

  let formattedRes = await searchedDataFormator(unformattedData);
  const issues = [];
  issues.push(...formattedRes);

  while (formattedRes?.length) {
    const lastHit = unformattedData.hits.hits[unformattedData.hits.hits.length - 1];
    const requestBodyQuery = issueQuery.searchAfter([lastHit.sort[0]]).toJSON();

    unformattedData = await esClientObj.esbRequestBodySearch(
      Jira.Enums.IndexName.Issue,
      requestBodyQuery
    );

    formattedRes = await searchedDataFormator(unformattedData);
    issues.push(...formattedRes);
  }

  return issues;
};

export const estimatesVsActualsBreakdown = async (
  projectId: string,
  sprintId: string,
  page: number,
  limit: number,
  sortKey: string,
  sortOrder: string,
  orgId: string,
  orgname: string
): Promise<{
  data: Jira.Type.EstimatesVsActualsBreakdownResponse[];
  totalPages: number;
  page: number;
}> => {
  try {
    const issueData = await fetchIssueData(projectId, sprintId, orgId);

    const response = await Promise.all(
      issueData?.map(async (issue) => {
        const keys = issue.subtasks?.map((ele: { key: string }) => ele.key);

        const query = esb
          .requestBodySearch()
          .query(
            esb
              .boolQuery()
              .must([
                esb.termQuery('body.projectId', projectId),
                esb.termQuery('body.sprintId', sprintId),
                esb.termQuery('body.organizationId.keyword', orgId),
                esb.termsQuery('body.issueKey', keys),
              ])
          )
          .size(100)
          .source(['body.id', 'body.issueKey', 'body.timeTracker'])
          .toJSON();

        const subtaskData =
          keys?.length > 0
            ? await searchedDataFormator(
                await esClientObj.esbRequestBodySearch(Jira.Enums.IndexName.Issue, query)
              )
            : [];

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
        subtaskData?.forEach((subtask) => {
          const subEstimate = subtask?.timeTracker?.estimate ?? 0;
          const subActual = subtask?.timeTracker?.actual ?? 0;
          overallEstimate += subEstimate;
          overallActual += subActual;

          subtasksArr.push({
            id: subtask.id,
            estimate: subEstimate,
            actual: subActual,
            variance: parseFloat((((subActual - subEstimate) / subEstimate) * 100).toFixed(1)),
            link: `https://${orgname}.atlassian.net/browse/${subtask?.issueKey}`,
          });
        });
        return {
          id: issue.id,
          estimate,
          actual,
          variance: parseFloat((((actual - estimate) / estimate) * 100).toFixed(1)),
          overallEstimate,
          overallActual,
          overallVariance: parseFloat(
            (((overallActual - overallEstimate) / overallEstimate) * 100).toFixed(1)
          ),
          hasSubtasks: subtasksArr?.length > 0,
          link: `https://${orgname}.atlassian.net/browse/${issue.issueKey}`,
          subtasks: subtasksArr,
        };
      })
    );
    const data = response.filter((ele) => ele.overallEstimate !== 0);
    const orderedData = _.orderBy(data, [sortKey], [sortOrder as 'asc' | 'desc']);
    const paginatedData = await paginate(orderedData, page, limit);
    return { data: paginatedData, totalPages: Math.ceil(paginatedData.length / limit), page };
  } catch (e) {
    throw new Error(`estimates-vs-actuals-breakdown-error: ${e}`);
  }
};
