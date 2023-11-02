import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Closes a Jira sprint and sends a message to an SQS queue.
 * @param sprint - The sprint to be closed.
 * @param organization - The name of the organization associated with the sprint.
 * @returns A Promise that resolves when the sprint is closed and the message is sent to the SQS queue.
 */
export async function close(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string
): Promise<void> {
  logger.info('sprint_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl);
}
