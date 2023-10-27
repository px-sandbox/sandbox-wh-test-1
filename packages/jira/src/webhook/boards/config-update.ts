import { Jira } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { getBoardById } from '../../repository/board/get-board';
import { mappingToApiDataConfig } from './mapper';

export async function updateConfig(
  config: Jira.ExternalType.Webhook.BoardConfig,
  organization: string
): Promise<void | false> {
  try {
    const boardIndexData = await getBoardById(config.id);
    if (!boardIndexData) {
      logger.info('boardConfigUpdatedEvent: Board not found');
      return false;
    }

    const userData = mappingToApiDataConfig(config, boardIndexData, organization);
    logger.info('boardUpdatedEvent: Send message to SQS');
    await new SQSClient().sendMessage(userData, Queue.jira_board_format.queueUrl);
  } catch (error) {
    logger.error('boardUpdatedEvent.error', { error });
  }
}
