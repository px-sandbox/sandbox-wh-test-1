import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organization: string, projectId: string): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const boards = await jira.getBoards(projectId);

  const sqsClient = new SQSClient();

  const createdAt = new Date().toISOString();
  const deletedAt = null;

  await Promise.all(
    [...boards.map(async (board) =>
      sqsClient.sendMessage(
        {
          ...board,
          isDeleted: !!deletedAt,
          deletedAt,
          createdAt,
          organization,
        },
        Queue.jira_board_format.queueUrl
      )
    ),
    ...boards.map(async (board) =>
      sqsClient.sendMessage(
        { organization, projectId, boardId: board.id },
        Queue.jira_sprint_migrate.queueUrl
      )
    )]
  );


}

export const handler = async function boardMirgration(event: SQSEvent): Promise<void> {
  try {
    await Promise.all(
      event.Records.map((record: SQSRecord) => {

        const { organization, projectId }: { organization: string; projectId: string } = JSON.parse(
          record.body
        );
        return checkAndSave(organization, projectId);

      })
    );
  } catch (error) {
    logger.error(JSON.stringify({ error, event }));
  }
};
