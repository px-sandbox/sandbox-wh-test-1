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
  const issues = await jira.getIssues(boardId, sprintId);

  const sqsClient = new SQSClient();

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
        Queue.jira_issue_format.queueUrl
      )
    )
  );
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
        await logProcessToRetry(record, Queue.jira_issue_format.queueUrl, error as Error);
        logger.error('issueMigrateDataReciever.error', error);
      }
    })
  );
};
