/* eslint-disable no-await-in-loop */
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
  page: number,
  limit: number,
  sortKey: string,
  sortOrder: string
): Promise<{
  issueData: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[];
  totalPages: number;
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
        .should([
          esb
            .boolQuery()
            .filter([
              esb.scriptQuery(
                esb.script().lang('painless').source("doc['body.timeTracker.estimate'].value <= 0")
              ),
              esb.scriptQuery(
                esb.script().lang('painless').source("doc['body.subtasks'].size() > 0")
              ),
            ]),
          esb.boolQuery().filter(esb.rangeQuery('body.timeTracker.estimate').gt(0)),
        ])
    )
    .sort(esb.sort(`body.timeTracker.${sortKey}`, sortOrder))
    .from((page - 1) * limit)
    .size(limit)
    .source(['body.id', 'body.issueKey', 'body.timeTracker', 'body.subtasks']);

  const unformattedData: Other.Type.HitBody = await esClientObj.esbRequestBodySearch(
    Jira.Enums.IndexName.Issue,
    issueQuery.toJSON()
  );

  const totalPages = Math.ceil(unformattedData.hits.total.value / limit);

  return { issueData: await searchedDataFormator(unformattedData), totalPages };
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
    const { issueData, totalPages } = await fetchIssueData(
      projectId,
      sprintId,
      orgId,
      page,
      limit,
      sortKey,
      sortOrder
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
            variance: parseFloat((((subActual - subEstimate) / subEstimate) * 100).toFixed(2)),
            link: `https://${orgname}.atlassian.net/browse/${subtask?.issueKey}`,
          });
        });
        return {
          id: issue.id,
          estimate,
          actual,
          variance: parseFloat((((actual - estimate) / estimate) * 100).toFixed(2)),
          overallEstimate,
          overallActual,
          overallVariance: parseFloat(
            (((overallActual - overallEstimate) / overallEstimate) * 100).toFixed(2)
          ),
          hasSubtasks: subtasksArr?.length > 0,
          link: `https://${orgname}.atlassian.net/browse/${issue.issueKey}`,
          subtasks: subtasksArr,
        };
      })
    );

    return { data: response, totalPages, page };
  } catch (e) {
    throw new Error(`estimates-vs-actuals-breakdown-error: ${e}`);
  }
};
