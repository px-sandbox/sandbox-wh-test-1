import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../util/retry-process';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organization: string, projectId: string, originBoardId: string): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const sprints = await jira.getSprints(originBoardId);

  const sqsClient = new SQSClient();

  await Promise.all(
    [...sprints.map(async (sprint) =>
      sqsClient.sendMessage(
        {
          organization,
          projectId,
          originBoardId,
          ...sprint,
        },
        Queue.jira_sprint_format.queueUrl
      ),
    ),
    ...sprints.map(async (sprint) =>
      sqsClient.sendMessage(
        { organization, projectId, originBoardId, sprintId: sprint.id },
        Queue.jira_issue_migrate.queueUrl
      ),
    )]
  );
}

export const handler = async function migrateSprint(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const {
          organization,
          projectId,
          boardId,
        }: {
          organization: string;
          projectId: string;
          boardId: string;
        } = JSON.parse(record.body);
        return checkAndSave(organization, projectId, boardId);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
        await logProcessToRetry(record, Queue.jira_sprint_migrate.queueUrl, error as Error);
        logger.error('sprintMigrateDataReciever.error', error);
      }
    })
  );
};
