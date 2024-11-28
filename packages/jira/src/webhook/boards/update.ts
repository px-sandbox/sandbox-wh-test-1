import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';
import { getBoardById } from '../../repository/board/get-board';
import { mappingToApiData } from './mapper';

const sqsClient = SQSClient.getInstance();
/**
 * Updates a Jira board webhook.
 * @param board - The board object to update.
 * @param organization - The name of the organization.
 * @returns A Promise that resolves with void if the board is updated successfully, or false if the board is not found.
 */
export async function update(
  board: Jira.ExternalType.Webhook.Board,
  organization: string,
  requestId: string
): Promise<void | false> {
  const resourceId = board.id.toString();
  const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
  const jiraClient = await JiraClient.getClient(organization);
  const data = await jiraClient.getBoard(board.id);

  logger.info({
    requestId,
    resourceId,
    message: 'board_event',
    data: {
      projectKey: data.location.projectKey,
      availableProjectKeys: projectKeys,
    },
  });

  if (projectKeys.includes(data.location.projectKey)) {
    logger.info({
      requestId,
      resourceId,
      message: 'board_update_event: Project not available in our system',
    });
    return;
  }

  const boardIndexData = await getBoardById(board.id, organization, { requestId, resourceId });
  if (!boardIndexData) {
    logger.info({ requestId, resourceId, message: 'boardUpdatedEvent: Board not found' });
    return false;
  }

  const boardData = mappingToApiData(board, boardIndexData.createdAt, organization);
  logger.info({ requestId, resourceId, message: 'boardUpdatedEvent: Send message to SQS' });
  await sqsClient.sendMessage(boardData, Queue.qBoardFormat.queueUrl, { requestId, resourceId });
}
