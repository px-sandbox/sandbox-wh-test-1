import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { projectKeysMapper } from './mapper';

/**
 * Handles the project restore deleted event by sending a message to SQS queue.
 * @param project - The Jira project object.
 * @returns A Promise that resolves when the message is sent to the queue.
 */
export async function restoreDeleted(project: Jira.ExternalType.Webhook.Project, organization:string): Promise<void> {
  const updatedProjectBody = projectKeysMapper(project, organization);
  updatedProjectBody.organization = organization;

  logger.info('processProjectRestoreDeletedEvent: Send message to SQS');
  await new SQSClient().sendMessage(updatedProjectBody, Queue.jira_project_format.queueUrl);
}
