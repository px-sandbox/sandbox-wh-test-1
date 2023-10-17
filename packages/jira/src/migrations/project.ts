import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../util/retry-process';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organization: string, projectId: string): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const boards = await jira.getBoards(projectId);
  logger.info(`Boards for project ${projectId} are ${JSON.stringify(boards)}`);

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
        organization,
        ...project,
      },
      Queue.jira_project_format.queueUrl
    ),
    sqsClient.sendMessage(
      { organization, projectId: project.id },
      Queue.jira_board_migrate.queueUrl
    ),
  ]);
}

export const handler = async function projectMigration(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const { organization, projectId } = JSON.parse(record.body);
        return checkAndSave(organization, projectId);

      } catch (error) {
        logger.error(JSON.stringify({ error, event }));
        await logProcessToRetry(record, Queue.jira_project_migrate.queueUrl, error as Error);
        logger.error('projectMigrateDataReciever.error', error);
      }
    })
  )
}
