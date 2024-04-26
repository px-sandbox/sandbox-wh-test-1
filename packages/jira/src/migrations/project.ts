import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../util/retry-process';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(
  organization: string,
  projectId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const boards = await jira.getBoards(projectId);
  logger.info({
    ...reqCtx,
    message: `Boards for project ${projectId} are ${JSON.stringify(boards)}`,
  });

  const isProjectElegible = boards.some((board) => board.type === Jira.Enums.BoardType.Scrum);

  if (!isProjectElegible) {
    logger.info({ ...reqCtx, message: `Project ${projectId} is not eligible for import` });
    return;
  }

  const sqsClient = SQSClient.getInstance();

  // get project details and send it to formatter
  const project = await jira.getProject(projectId);

  await Promise.all([
    sqsClient.sendMessage(
      {
        organization,
        ...project,
      },
      Queue.qProjectFormat.queueUrl,
      reqCtx
    ),
    sqsClient.sendMessage(
      { organization, projectId: project.id },
      Queue.qBoardMigrate.queueUrl,
      reqCtx
    ),
  ]);
}

export const handler = async function projectMigration(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx,
        message: { organization, projectId },
      } = JSON.parse(record.body);
      try {
        return checkAndSave(organization, projectId, reqCtx);
      } catch (error) {
        logger.error({ ...reqCtx, message: JSON.stringify({ error, event }) });
        await logProcessToRetry(record, Queue.qProjectMigrate.queueUrl, error as Error);
        logger.error({ ...reqCtx, message: 'projectMigrateDataReciever.error', error });
      }
    })
  );
};
