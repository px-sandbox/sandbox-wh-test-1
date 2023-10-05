import { Jira } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { JiraClient } from '../../lib/jira-client';
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
    const deletedAt = null;
    
    const jiraClient = await JiraClient.getClient(organization);
    const apiUserData = await jiraClient.getBoardConfig(config.id);

    const userData = mappingToApiDataConfig(apiUserData, boardIndexData, organization, deletedAt);
    logger.info('boardUpdatedEvent: Send message to SQS');
    await new SQSClient().sendMessage(userData, Queue.jira_board_format.queueUrl);
  } catch (error) {
    logger.error('boardUpdatedEvent.error', { error });
  }
}
