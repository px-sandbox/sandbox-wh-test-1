import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(
  organisation: string,
  projectId: string,
  boardId: string,
  sprint: Jira.ExternalType.Api.Sprint
) {
  const jira = await JiraClient.getClient(organisation);
  const issues = await jira.getIssues(boardId, sprint.id);

  const sqsClient = new SQSClient();

  // get project details and send it to formatter

  await Promise.all([
    sqsClient.sendMessage(
      {
        organisation,
        projectId,
        boardId,
        sprint,
      },
      Queue.jira_sprint_mirate.queueUrl
    ),
    ...issues.map(async (issue) =>
      sqsClient.sendMessage(
        { organisation, projectId, boardId, sprint, issue },
        Queue.jira_issue_migrate.queueUrl
      )
    ),
  ]);
}

export const handler = async function (event: SQSEvent) {
  await Promise.all(
    event.Records.map((record: SQSRecord) => {
      try {
        const {
          organisation,
          projectId,
          boardId,
          sprint,
        }: {
          organisation: string;
          projectId: string;
          boardId: string;
          sprint: Jira.ExternalType.Api.Sprint;
        } = JSON.parse(record.body);
        return checkAndSave(organisation, projectId, boardId, sprint);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
