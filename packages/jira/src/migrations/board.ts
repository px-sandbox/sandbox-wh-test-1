import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { logProcessToRetry } from '../util/retry-process';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organization: string, projectId: string): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const boards = await jira.getBoards(projectId);

  const sqsClient = SQSClient.getInstance();  

  const createdAt = new Date().toISOString();
  const deletedAt = null;

  await Promise.all(
    [...boards.filter(board => board.type === Jira.Enums.BoardType.Scrum).map(async (board) =>
      sqsClient.sendMessage(
        {
          ...board,
          isDeleted: !!deletedAt,
          deletedAt,
          createdAt,
          organization,
        },
        Queue.qBoardFormat.queueUrl
      )
    ),
    ...boards.filter(board => board.type === Jira.Enums.BoardType.Scrum).map(async (board) =>
      sqsClient.sendMessage(
        { organization, projectId, boardId: board.id },
        Queue.qSprintMigrate.queueUrl
      )
    )]
  );


}

export const handler = async function boardMirgration(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const { organization, projectId }: { organization: string; projectId: string } = JSON.parse(
          record.body
        );
        return checkAndSave(organization, projectId);

      } catch (error) {
        logger.error(JSON.stringify({ error, event }));
        await logProcessToRetry(record, Queue.qBoardMigrate.queueUrl, error as Error);
        logger.error('boardMigrateDataReciever.error', error);
      }
    })
  );
};
