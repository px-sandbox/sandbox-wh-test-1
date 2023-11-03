import { Jira } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { getBoardById } from '../../repository/board/get-board';
import { mappingToApiDataConfig } from './mapper';

/**
 * Updates the configuration of a Jira board.
 * @param config - The new configuration for the board.
 * @param organization - The name of the organization the board belongs to.
 * @returns A Promise that resolves with void if the update is successful, or false if the board is not found.
 */
export async function updateConfig(
  config: Jira.ExternalType.Webhook.BoardConfig,
  organization: string
): Promise<void | false> {
  try {
    const boardIndexData = await getBoardById(config.id, organization);
    if (!boardIndexData) {
      logger.info('boardConfigUpdatedEvent: Board not found');
      return false;
    }

    const userData = mappingToApiDataConfig(config, boardIndexData, organization);
    logger.info('boardUpdatedEvent: Send message to SQS');
    await new SQSClient().sendMessage(userData, Queue.qBoardFormat.queueUrl);
  } catch (error) {
    logger.error('boardUpdatedEvent.error', { error });
  }
}
