import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organisation: string, projectId: string, boardId: string) {
  const jira = await JiraClient.getClient(organisation);
  const sprints = await jira.getSprints(boardId);

  const sqsClient = new SQSClient();

  await Promise.all(
    sprints.flatMap(async (sprint) => [
      sqsClient.sendMessage(
        {
          organisation,
          projectId,
          boardId,
          sprint,
        },
        Queue.jira_sprint_format.queueUrl
      ),
      sqsClient.sendMessage(
        { organisation, projectId, boardId, sprintId: sprint.id },
        Queue.jira_issue_migrate.queueUrl
      ),
    ])
  );
}

export const handler = async function (event: SQSEvent) {
  await Promise.all(
    event.Records.map((record: SQSRecord) => {
      try {
        const {
          organisation,
          projectId,
          boardId,
        }: {
          organisation: string;
          projectId: string;
          boardId: string;
        } = JSON.parse(record.body);
        return checkAndSave(organisation, projectId, boardId);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
