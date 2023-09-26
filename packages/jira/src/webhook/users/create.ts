import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function userCreatedEvent(user: Jira.ExternalType.Webhook.User): Promise<void> {
  logger.info('userCreatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(user, Queue.jira_users_format.queueUrl);
}
