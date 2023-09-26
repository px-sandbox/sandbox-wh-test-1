import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { getUserById } from '../../repository/get-user';

export async function userUpdatedEvent(
  user: Jira.ExternalType.Webhook.User
): Promise<void | false> {
  const userData = await getUserById(user.accountId);
  if (!userData) {
    logger.info('userUpdatedEvent: User not found');
    return false;
  }
  logger.info('userUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(user, Queue.jira_users_format.queueUrl);
}
