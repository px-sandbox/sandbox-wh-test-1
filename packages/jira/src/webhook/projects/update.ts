import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Sends a message to SQS when a Jira project is updated.
 * @param project - The updated Jira project.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function update(project: Jira.ExternalType.Webhook.Project): Promise<void> {
  logger.info('processProjectUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(project, Queue.jira_projects_format.queueUrl);
}
