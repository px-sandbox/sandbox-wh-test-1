import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';

/**
 * Closes a Jira sprint and sends a message to an SQS queue.
 * @param sprint - The sprint to be closed.
 * @param organization - The name of the organization associated with the sprint.
 * @returns A Promise that resolves when the sprint is closed and the message is sent to the SQS queue.
 */
export async function close(
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
    await new SQSClient().sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl);
  } catch (e) {
    logger.error('sprintCloseEvent: Error in closing sprint', e);
    throw e;
  }
}
