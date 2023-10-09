import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organisation: string, projectId: string) {
  const jira = await JiraClient.getClient(organisation);
  const boards = await jira.getBoards(projectId);

  const isProjectElegible = boards.some((board) => board.type === Jira.Enums.BoardType.Scrum);

  if (!isProjectElegible) {
    logger.info(`Project ${projectId} is not eligible for import`);
    return;
  }

  const sqsClient = new SQSClient();

  // get project details and send it to formatter
  const project = await jira.getProject(projectId);

  await Promise.all([
    sqsClient.sendMessage(
      {
        organisation,
        project,
      },
      Queue.jira_project_format.queueUrl
    ),
    sqsClient.sendMessage(
      { organisation, projectId: project.id },
      Queue.jira_board_migrate.queueUrl
    ),

  ]);
}

export const handler = async function (event: SQSEvent) {
  await Promise.all(
    event.Records.map((record: SQSRecord) => {
      try {
        const { organisation, projectId } = JSON.parse(record.body);
        return checkAndSave(organisation, projectId);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
