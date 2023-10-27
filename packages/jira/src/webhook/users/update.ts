import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { getUserById } from '../../repository/user/get-user';
import { mappingToApiData } from './mapper';

/**
 * Updates a Jira user in the system.
 * @param user - The user object to update.
 * @param organization - The organization to which the user belongs.
 * @returns A Promise that resolves with void if the user was updated successfully, or false if the user was not found.
 */
export async function update(
  user: Jira.ExternalType.Webhook.User,
  organization: string
): Promise<void | false> {
  const userIndexData = await getUserById(user.accountId, organization);
  if (!userIndexData) {
    logger.info('userUpdatedEvent: User not found');
    return false;
  }

  const userData = mappingToApiData(user, userIndexData.createdAt, organization);
  logger.info('userUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(userData, Queue.jira_user_format.queueUrl);
}
