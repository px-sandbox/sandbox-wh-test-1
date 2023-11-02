import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Updates the given sprint and sends a message to the SQS queue.
 * @param sprint - The sprint to update.
 * @param organization - The organization associated with the sprint.
 * @returns A Promise that resolves when the message is sent to the SQS queue.
 */
export async function update(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string
): Promise<void> {
  logger.info('sprint_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl);
}
