import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

/**
 * Updates a Jira issue using webhook data.
 * @param issue The Jira issue to update.
 * @returns A Promise that resolves when the update is complete.
 */
export async function update(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {
  logger.info('issue_update_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...issue }, Queue.qIssueFormat.queueUrl);
}
