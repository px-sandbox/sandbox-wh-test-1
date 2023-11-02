import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { projectKeysMapper } from './mapper';


/**
 * Creates a new Jira project and sends a message to SQS queue.
 * @param project - The Jira project to be created.
 * @param eventTime - The time when the project was created.
 * @param organization - The organization to which the project belongs.
 * @returns A Promise that resolves when the message is sent to the SQS queue.
 */
export async function create(
  project: Jira.ExternalType.Webhook.Project,
  eventTime: moment.Moment,
  organization: string)
  : Promise<void> {
  const createdAt = moment(eventTime).toISOString();
  const updatedProjectBody = projectKeysMapper(project, createdAt, organization);
  logger.info('processProjectCreatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(updatedProjectBody, Queue.qProjectFormat.queueUrl);
}
