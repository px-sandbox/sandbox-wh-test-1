import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Sends a message to SQS when a sprint is started.
 * @param sprint - The sprint object received from the Jira webhook.
 * @param organization - The name of the organization associated with the sprint.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function start(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string
): Promise<void> {
  logger.info('sprint_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...sprint, organization }, Queue.jira_sprint_format.queueUrl);
}
