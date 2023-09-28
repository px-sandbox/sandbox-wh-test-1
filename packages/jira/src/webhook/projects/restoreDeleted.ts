import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Handles the project restore deleted event by sending a message to SQS queue.
 * @param project - The Jira project object.
 * @returns A Promise that resolves when the message is sent to the queue.
 */
export async function restoreDeleted(project: Jira.ExternalType.Webhook.Project): Promise<void> {
  logger.info('processProjectRestoreDeletedEvent: Send message to SQS');
  await new SQSClient().sendMessage(project, Queue.jira_projects_format.queueUrl);
}
