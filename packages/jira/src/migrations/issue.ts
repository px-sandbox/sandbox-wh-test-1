import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(
  organisation: string,
  projectId: string,
  boardId: string,
  sprintId: string
) {
  const jira = await JiraClient.getClient(organisation);
  const issues = await jira.getIssues(boardId, sprintId);

  const sqsClient = new SQSClient();

  await Promise.all(
    issues.map(async (issue) =>
      sqsClient.sendMessage(
        {
          organisation,
          projectId,
          boardId,
          issue,
        },
        Queue.jira_sprint_format.queueUrl
      )
    )
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
          sprintId,
        }: {
          organisation: string;
          projectId: string;
          boardId: string;
          sprintId: string;
        } = JSON.parse(record.body);
        return checkAndSave(organisation, projectId, boardId, sprintId);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
