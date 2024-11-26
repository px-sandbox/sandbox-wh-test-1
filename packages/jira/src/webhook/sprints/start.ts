import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';

const sqsClient = SQSClient.getInstance();
/**
 * Sends a message to SQS when a sprint is started.
 * @param sprint - The sprint object received from the Jira webhook.
 * @param organization - The name of the organization associated with the sprint.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function start(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = sprint.id;
  try {
    const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
    const jiraClient = await JiraClient.getClient(organization);
    const data = await jiraClient.getBoard(sprint.originBoardId);

    logger.info({
      requestId,
      resourceId,
      message: 'sprint_event',
      data: {
        projectKey: data.location.projectKey,
        availableProjectKeys: projectKeys,
      },
    });

    if (projectKeys.includes(data.location.projectKey)) {
      logger.info({
        requestId,
        resourceId,
        message: 'sprint_event: Project not available in our system',
      });
      return;
    }

    logger.info({ requestId, resourceId, message: 'sprint_event: Send message to SQS' });

    await sqsClient.sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl, {
      requestId,
      resourceId,
    });
  } catch (error) {
    logger.error({
      requestId,
      resourceId,
      message: 'sprintStartEvent: Error in starting sprint',
      error,
    });
    throw error;
  }
}
