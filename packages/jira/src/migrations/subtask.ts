import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { JiraClient } from 'src/lib/jira-client';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});

async function fetchJiraIssues(projectId: string, orgId: string): Promise<Other.Type.HitBody[]> {
  const issueQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.issueType', ['Story', 'Task']),
        ])
    )
    .sort(esb.sort('_id'))
    .size(100);

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
  logger.info(`fetchJiraIssues.successful with length:, ${issues.length}`);
  return issues;
}

async function updateIssuesWithSubtasks(
  organization: string,
  issueIdsArr: Other.Type.HitBody[]
): Promise<void> {
  await Promise.all(
    issueIdsArr.map(async (issueData: Other.Type.HitBody) => {
      try {
        const jira = await JiraClient.getClient(organization);
        const issue = await jira.getIssue(issueData.issueId);

        logger.info(`
  FETCHING ISSUES FOR THIS 
  projectId: ${issueData.projectId}
  organization: ${organization},
  issueId: ${issueData.issueId},
  sprintId: ${issueData.sprintId},
  `);
        const sqsClient = new SQSClient();

        await sqsClient.sendMessage(
          {
            organization,
            projectId: issueData.projectId,
            boardId: issueData.boardId,
            sprintId: issueData.sprintId,
            issue,
          },
          Queue.qIssueFormat.queueUrl
        );
      } catch (error) {
        logger.error(`JIRA_SUBTASK_ISSUE_DETAILS_MIGRATION', ${error}`);
      }
    })
  );
  logger.info('subtaskMigrateFormatterDataReceiver.successful');
}

export async function subtaskMigrate(
  projectId: string,
  organizationName: string,
  orgId: string
): Promise<void> {
  try {
    const issues = await fetchJiraIssues(projectId, orgId);
    if (issues.length === 0) {
      throw new Error(`No issues found orgName: ${organizationName}, ProjectId: ${projectId}`);
    }
    await updateIssuesWithSubtasks(organizationName, issues);
  } catch (error) {
    logger.error(`subtaskMigrateDataReceiver.error, ${error}`);
  }
}
