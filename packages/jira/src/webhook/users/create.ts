import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { mappingToApiData } from './mapper';

const sqsClient = SQSClient.getInstance();
/**
 * Creates a new user in Jira and sends a message to SQS.
 * @param user - The user object to be created.
 * @param eventTime - The time when the user was created.
 * @param organization - The organization to which the user belongs.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(
  user: Jira.ExternalType.Webhook.User,
  eventTime: moment.Moment,
  organization: string
): Promise<void> {
  try {
    const createdAt = moment(eventTime).toISOString();
    const userData = mappingToApiData(user, createdAt, organization);
    logger.info('userCreatedEvent: Send message to SQS');

    await sqsClient.sendMessage(userData, Queue.qUserFormat.queueUrl);
  } catch (error) {
    logger.error('userCreatedEvent.error', { error });
  }
}
