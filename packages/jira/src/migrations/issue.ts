import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../util/retry-process';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(
  organization: string,
  projectId: string,
  boardId: string,
  sprintId: string
): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const issues = await jira.getIssues(sprintId);

  logger.info(`
  FETCHING ISSUES FOR THIS 
  sprintId: ${sprintId}
  boardId: ${boardId}
  projectId: ${projectId}
  organization: ${organization}
  issues: ${issues.length}
  total: ${Array.from(new Set(issues.map((issue) => issue.id))).length}
  `);
  const sqsClient = SQSClient.getInstance();

  await Promise.all(
    issues.map(async (issue) =>
      sqsClient.sendMessage(
        {
          organization,
          projectId,
          boardId,
          sprintId,
          issue,
        },
        Queue.qIssueFormat.queueUrl
      )
    )
  );
  logger.info('issuesMigrateDataReciever.successful');
}

export const handler = async function issuesMigrate(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const {
          organization,
          projectId,
          originBoardId,
          sprintId,
        }: {
          organization: string;
          projectId: string;
          originBoardId: string;
          sprintId: string;
        } = JSON.parse(record.body);
        return checkAndSave(organization, projectId, originBoardId, sprintId);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
        await logProcessToRetry(record, Queue.qIssueMigrate.queueUrl, error as Error);
        logger.error('issueMigrateDataReciever.error', error);
      }
    })
  );
};
