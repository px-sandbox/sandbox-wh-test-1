import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { JiraClient } from '../../lib/jira-client';
import { mappingToApiData } from './mapper';

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
    const deletedAt = null;
    const jiraClient = await JiraClient.getClient(organization);
    const apiUserData = await jiraClient.getUser(user.accountId);
    const userData = mappingToApiData(apiUserData, createdAt, organization, deletedAt);
    logger.info('userCreatedEvent: Send message to SQS');
    await new SQSClient().sendMessage(userData, Queue.jira_users_format.queueUrl);
  } catch (error) {
    logger.error('userCreatedEvent.error', { error });
  }
}
