import { Jira } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';
import { getBoardById } from '../../repository/board/get-board';
import { mappingToApiDataConfig } from './mapper';

const sqsClient = SQSClient.getInstance();
/**
 * Updates the configuration of a Jira board.
 * @param config - The new configuration for the board.
 * @param organization - The name of the organization the board belongs to.
 * @returns A Promise that resolves with void if the update is successful, or false if the board is not found.
 */
export async function updateConfig(
  config: Jira.ExternalType.Webhook.BoardConfig,
  organization: string,
  requestId: string
): Promise<void | false> {
  const resourceId = config.id.toString();
  try {
    const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
    const jiraClient = await JiraClient.getClient(organization);
    const data = await jiraClient.getBoard(config.id);

    logger.info({
      requestId,
      resourceId,
      message: 'boardConfigUpdatedEvent',
      data: {
        projectKey: data.location.projectKey,
        availableProjectKeys: projectKeys,
      },
    });

    if (projectKeys.includes(data.location.projectKey)) {
      logger.info({
        requestId,
        resourceId,
        message: 'boardConfigUpdatedEvent: Project not available in our system',
      });
      return;
    }
    const boardIndexData = await getBoardById(config.id, organization, { requestId, resourceId });
    if (!boardIndexData) {
      logger.info({ requestId, resourceId, message: 'boardConfigUpdatedEvent: Board not found' });
      return false;
    }

    const userData = mappingToApiDataConfig(config, boardIndexData, organization);
    logger.info({ requestId, resourceId, message: 'boardUpdatedEvent: Send message to SQS' });

    await sqsClient.sendMessage(userData, Queue.qBoardFormat.queueUrl, { requestId, resourceId });
  } catch (error) {
    logger.error({ requestId, resourceId, message: 'boardUpdatedEvent.error', error });
  }
}
