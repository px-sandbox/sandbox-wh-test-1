import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { JiraClient } from '../lib/jira-client';

/**
 * Input: organisation, projectId
 * Check for the project satisfies the required coditions:
 * 1. The project has Scrum board
 * 2. The project has Medium Workflow v2
 *
 * If upper two conditions satisfies then import prject data otherwise ignore
 */

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
    await sqsClient.sendMessage(
      {
        organisation,
        project,
      },
      Queue.jira_projects_format.queueUrl
    ),
    ...boards
      .filter((board) => board.type === Jira.Enums.BoardType.Scrum)
      .map(async (board) =>
        sqsClient.sendMessage({ organisation, projectId, board }, Queue.jira_board_migrate.queueUrl)
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
