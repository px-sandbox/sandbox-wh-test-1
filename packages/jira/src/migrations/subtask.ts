/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { formatIssue } from '../util/issue-helper';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

/**
 * Fetches Jira issues based on the provided projectId and orgId.
 *
 * @param projectId - The ID of the project.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to an array of Jira issues.
 */
async function fetchJiraIssues(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<Other.Type.HitBody[]> {
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
  logger.info({ ...reqCtx, message: `fetchJiraIssues.successful with length:, ${issues.length}` });
  return issues;
}

/**
 * Updates issues with subtasks.
 *
 * @param organization - The organization name.
 * @param issueIdsArr - An array of issue data.
 * @returns A Promise that resolves when all the issues are updated.
 */
async function updateIssuesWithSubtasks(
  organization: string,
  issueIdsArr: Other.Type.HitBody[],
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  await Promise.all(
    issueIdsArr.map(async (issueData: Other.Type.HitBody) => {
      try {
        const issue = formatIssue(issueData);
        logger.info({
          ...reqCtx,
          message: `
  FETCHING ISSUES FOR THIS 
  projectId: ${issueData.projectId}
  organization: ${organization},
  issueId: ${issueData.issueId},
  sprintId: ${issueData.sprintId},
  `,
        });

        await sqsClient.sendFifoMessage(
          {
            organization,
            projectId: issueData.projectId,
            boardId: issueData.boardId,
            sprintId: issueData.sprintId,
            issue,
          },
          Queue.qIssueFormat.queueUrl,
          reqCtx,
          issue.key,
          uuid()
        );
      } catch (error) {
        logger.error({ ...reqCtx, message: `JIRA_SUBTASK_ISSUE_DETAILS_MIGRATION', ${error}` });
      }
    })
  );
  logger.info({ ...reqCtx, message: 'subtaskMigrateFormatterDataReceiver.successful' });
}

/**
 * Migrates subtasks for a given project and organization.
 *
 * @param projectId - The ID of the project.
 * @param organizationName - The name of the organization.
 * @param orgId - The ID of the organization.
 * @returns A Promise that resolves when the migration is complete.
 */
export async function subtaskMigrate(
  projectId: string,
  organizationName: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    const issues = await fetchJiraIssues(projectId, orgId, reqCtx);
    if (issues.length === 0) {
      throw new Error(`No issues found orgName: ${organizationName}, ProjectId: ${projectId}`);
    }
    await updateIssuesWithSubtasks(organizationName, issues, reqCtx);
  } catch (error) {
    logger.error({ ...reqCtx, message: `subtaskMigrateDataReceiver.error, ${error}` });
  }
}
