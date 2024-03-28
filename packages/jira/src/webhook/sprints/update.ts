import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClientGh } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';

const sqsClient = SQSClientGh.getInstance();
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
  try {
    const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
    const jiraClient = await JiraClient.getClient(organization);
    const data = await jiraClient.getBoard(sprint.originBoardId);

    logger.info('sprint_event', {
      projectKey: data.location.projectKey,
      availableProjectKeys: projectKeys,
    });

    if (!projectKeys.includes(data.location.projectKey)) {
      logger.info('sprint_event: Project not available in our system');
      return;
    }

    logger.info('sprint_event: Send message to SQS');
    // await new SQSClient().sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl);
    sqsClient.sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl);
  } catch (e) {
    logger.error('sprintUpdateEvent: Error in updating sprint', e);
    throw e;
  }
}
