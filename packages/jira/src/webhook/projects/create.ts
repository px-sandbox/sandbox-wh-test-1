import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { projectKeysMapper } from './mapper';

/**
 * Sends a message to SQS when a project is created.
 * @param project - The project that was created.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(project: Jira.ExternalType.Webhook.Project, organization:string)
: Promise<void> {
  const updatedProjectBody = projectKeysMapper(project, organization);
  updatedProjectBody.organization = organization;
  logger.info('processProjectCreatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(updatedProjectBody, Queue.jira_project_format.queueUrl);
}
