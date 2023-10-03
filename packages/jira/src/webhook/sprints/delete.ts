import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function deleteSprint(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organisation: string
): Promise<void> {
  logger.info('sprint_event: Send message to SQS');
  sprint.isDeleted = true;
  sprint.deletedAt = new Date().toISOString();
  await new SQSClient().sendMessage({ ...sprint, organisation }, Queue.jira_sprint_format.queueUrl);
}
