import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Creates a new sprint in Jira and sends a message to SQS.
 * @param sprint - The sprint object to be created.
 * @param organization - The name of the organization.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string
): Promise<void> {
  logger.info('sprint_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl);
}
