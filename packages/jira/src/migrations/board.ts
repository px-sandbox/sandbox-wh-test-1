import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(organisation: string, projectId: string) {
  const jira = await JiraClient.getClient(organisation);
  const boards = await jira.getBoards(projectId);

  const sqsClient = new SQSClient();

  await Promise.all([
    ...boards.flatMap(async (board) => [
      sqsClient.sendMessage(
        {
          organisation,
          projectId,
          board,
        },
        Queue.jira_board_format.queueUrl
      ),
      sqsClient.sendMessage(
        { organisation, projectId, boardId: board.id },
        Queue.jira_sprint_migrate.queueUrl
      )
    ]),
  ]);
}

export const handler = async function (event: SQSEvent) {
  await Promise.all(
    event.Records.map((record: SQSRecord) => {
      try {
        const { organisation, projectId }: { organisation: string; projectId: string } = JSON.parse(
          record.body
        );
        return checkAndSave(organisation, projectId);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
