import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function close(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string
): Promise<void> {
  logger.info('sprint_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...sprint, organization }, Queue.jira_sprint_format.queueUrl);
}
