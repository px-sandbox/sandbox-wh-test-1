import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';

export async function userCreatedEvent(
  user: Jira.ExternalType.Webhook.User,
  eventTime: moment.Moment,
  organization: string
): Promise<void> {
  const userData = { ...user };
  userData.createdAt = moment(eventTime).toISOString();
  userData.organization = organization;
  logger.info('userCreatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(userData, Queue.jira_users_format.queueUrl);
}
