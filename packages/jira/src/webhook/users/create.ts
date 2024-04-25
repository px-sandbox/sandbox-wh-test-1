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
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = user.accountId;
  try {
    const createdAt = moment(eventTime).toISOString();
    const userData = mappingToApiData(user, createdAt, organization);
    logger.info({ requestId, resourceId, message: 'userCreatedEvent: Send message to SQS' });

    await sqsClient.sendMessage(userData, Queue.qUserFormat.queueUrl, { requestId, resourceId });
  } catch (error) {
    logger.error({ requestId, resourceId, message: 'userCreatedEvent.error', error });
  }
}
