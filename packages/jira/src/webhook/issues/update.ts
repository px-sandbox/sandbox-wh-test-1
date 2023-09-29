import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function update(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {
  logger.info('issue_update_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...issue }, Queue.jira_issue_format.queueUrl);
}
