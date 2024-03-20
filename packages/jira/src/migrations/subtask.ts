import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

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
          esb.termsQuery('body.issueType', [IssuesTypes.STORY, IssuesTypes.TASK, IssuesTypes.BUG]),
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
  const sqsClient = new SQSClient();
  await Promise.all(
    issueIdsArr.map(async (issueData: Other.Type.HitBody) => {
      try {
        const issue = {
          id: issueData.issueId,
          key: issueData.issueKey,
          fields: {
            project: {
              id: issueData.projectId.replace(/jira_project_/g, ''),
              key: issueData.projectKey,
            },
            labels: issueData.labels,
            summary: issueData.summary,
            issuetype: {
              name: issueData.issueType,
            },
            priority: {
              name: issueData.priority,
            },
            issueLinks: issueData.issuelinks,
            assignee: issueData.assigneeId
              ? {
                  accountId: issueData.assigneeId.replace(/jira_user_/g, ''),
                }
              : null,
            reporter: issueData.reporterId
              ? {
                  accountId: issueData.reporterId.replace(/jira_user_/g, ''),
                }
              : null,
            creatorId: issueData.creatorId
              ? {
                  accountId: issueData.creatorId.replace(/jira_user_/g, ''),
                }
              : null,
            status: {
              name: issueData.status,
            },
            subtasks: issueData.subtasks,
            created: issueData.createdDate,
            updated: issueData.lastUpdated,
            lastViewed: issueData.lastViewed,
            isDeleted: issueData.isDeleted,
            deletedAt: issueData.deletedAt,
          },
        };
        logger.info(`
  FETCHING ISSUES FOR THIS 
  projectId: ${issueData.projectId}
  organization: ${organization},
  issueId: ${issueData.issueId},
  sprintId: ${issueData.sprintId},
  `);

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
