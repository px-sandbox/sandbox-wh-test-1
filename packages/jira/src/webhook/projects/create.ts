import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Sends a message to SQS when a project is created.
 * @param project - The project object received from the Jira webhook.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function projectCreatedEvent(project: Jira.ExternalType.Webhook.Project): Promise<void> {
  logger.info('processProjectCreatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(project, Queue.jira_projects_format.queueUrl);
}
