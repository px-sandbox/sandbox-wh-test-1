/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Jira, Other } from 'abstraction';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});

const fetchIssueData = async (
  projectId: string,
  sprintId: string,
  orgId: string,
  sortKey: string,
  sortOrder: string,
  page: number,
  limit: number
): Promise<Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]>> => {
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
    .sort(esb.sort(`body.timeTracker.${sortKey}`, sortOrder))
    .from((page - 1) * limit)
    .size(limit)
    .source([
      'body.id',
      'body.projectKey',
      'body.issueKey',
      'body.boardId',
      'body.timeTracker',
      'body.subtasks',
    ]);
  return searchedDataFormator(
    await esClientObj.esbRequestBodySearch(Jira.Enums.IndexName.Issue, issueQuery.toJSON())
  );
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
): Promise<Jira.Type.EstimatesVsActualsBreakdownResponse[]> => {
  try {
    const issueData = await fetchIssueData(
      projectId,
      sprintId,
      orgId,
      sortKey,
      sortOrder,
      page,
      limit
    );

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
    return response.filter((ele) => ele.overallEstimate !== 0);
  } catch (e) {
    throw new Error(`estimates-vs-actuals-breakdown-error: ${e}`);
  }
};
