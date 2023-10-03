import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { projectKeysMapper } from './mapper';


/**
 * Handles the project deleted event by sending a message to SQS.
 * @param project The project that was deleted.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function deleteProject(project: Jira.ExternalType.Webhook.Project, organization:string): Promise<void> {

  const updatedProjectBody = projectKeysMapper(project, organization);
  updatedProjectBody.organization = organization;

  logger.info('processProjectDeletedEvent: Send message to SQS');
  await new SQSClient().sendMessage(updatedProjectBody, Queue.jira_projects_format.queueUrl);
}
