import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Creates a Jira issue and sends a message to SQS.
 * @param issue - The Jira issue to create.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {
  logger.info('issue_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...issue }, Queue.qIssueFormat.queueUrl);
}
