import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

export async function projectUpdatedEvent(project: Jira.ExternalType.Webhook.Project): Promise<void> {
  logger.info('processProjectUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(project, Queue.jira_projects_format.queueUrl);
}
