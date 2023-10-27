import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { projectKeysMapper } from './mapper';

/**
 * Sends a message to SQS when a Jira project is updated.
 * @param project - The updated Jira project.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function update(project: Jira.ExternalType.Webhook.Project, organization:string): Promise<void> {

  const updatedProjectBody: Jira.Mapped.Project = projectKeysMapper(project, organization);
  // updatedProjectBody.organization = organization;
  

  logger.info('processProjectUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(updatedProjectBody, Queue.jira_project_format.queueUrl);
}
