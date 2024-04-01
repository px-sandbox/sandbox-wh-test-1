import { Jira } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClientGh } from '@pulse/event-handler';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';
import { getBoardById } from '../../repository/board/get-board';
import { mappingToApiDataConfig } from './mapper';

const sqsClient = SQSClientGh.getInstance();
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
    const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
    const jiraClient = await JiraClient.getClient(organization);
    const data = await jiraClient.getBoard(config.id);

    logger.info('boardConfigUpdatedEvent', {
      projectKey: data.location.projectKey,
      availableProjectKeys: projectKeys,
    });

    if (!projectKeys.includes(data.location.projectKey)) {
      logger.info('boardConfigUpdatedEvent: Project not available in our system');
      return;
    }
    const boardIndexData = await getBoardById(config.id, organization);
    if (!boardIndexData) {
      logger.info('boardConfigUpdatedEvent: Board not found');
      return false;
    }

    const userData = mappingToApiDataConfig(config, boardIndexData, organization);
    logger.info('boardUpdatedEvent: Send message to SQS');

    await sqsClient.sendMessage(userData, Queue.qBoardFormat.queueUrl);
  } catch (error) {
    logger.error('boardUpdatedEvent.error', { error });
  }
}
