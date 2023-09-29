import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function deleted(
  issue: Jira.ExternalType.Webhook.Issue,
  organization: string
): Promise<void> {
  logger.info('issue_deleted_event: Send message to SQS');
  issue.issue.isDeleted = true;
  issue.issue.deletedAt = new Date().toISOString();
  await new SQSClient().sendMessage({ ...issue, organization }, Queue.jira_issue_format.queueUrl);
}
