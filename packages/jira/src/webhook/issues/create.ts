import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function create(
  issue: Jira.ExternalType.Webhook.Issue,
  organization: string
): Promise<void> {
  logger.info('issue_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...issue, organization }, Queue.jira_issue_format.queueUrl);
}
