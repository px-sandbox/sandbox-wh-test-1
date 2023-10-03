import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(
  organisation: string,
  projectId: string,
  board: Jira.ExternalType.Api.Board
) {
  const jira = await JiraClient.getClient(organisation);
  const sprints = await jira.getSprints(board.id);

  const sqsClient = new SQSClient();

  // get project details and send it to formatter

  await Promise.all([
    sqsClient.sendMessage(
      {
        organisation,
        projectId,
        board,
      },
      Queue.jira_board_mirate.queueUrl
    ),
    ...sprints.map(async (sprint) =>
      sqsClient.sendMessage(
        { organisation, projectId, boardId: board.id, sprint },
        Queue.jira_sprint_migrate.queueUrl
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
          board,
        }: { organisation: string; projectId: string; board: Jira.ExternalType.Api.Board } =
          JSON.parse(record.body);
        return checkAndSave(organisation, projectId, board);
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
