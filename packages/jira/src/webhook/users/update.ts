import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { getUserById } from '../../repository/user/get-user';

export async function userUpdatedEvent(
  user: Jira.ExternalType.Webhook.User,
  organization: string
): Promise<void | false> {
  const userIndexData = await getUserById(user.accountId);
  if (!userIndexData) {
    logger.info('userUpdatedEvent: User not found');
    return false;
  }
  const userData = { ...user };
  userData.createdAt = userIndexData.createdAt;
  userData.organization = organization;
  logger.info('userUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(userData, Queue.jira_users_format.queueUrl);
}
