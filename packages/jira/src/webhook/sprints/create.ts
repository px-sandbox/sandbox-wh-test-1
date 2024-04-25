import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();
/**
 * Creates a new sprint in Jira and sends a message to SQS.
 * @param sprint - The sprint object to be created.
 * @param organization - The name of the organization.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(
  sprint: Jira.ExternalType.Webhook.Sprint,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = sprint.id;
  try {
    logger.info({ requestId, resourceId, message: 'sprint_event: Send message to SQS' });

    await sqsClient.sendMessage({ ...sprint, organization }, Queue.qSprintFormat.queueUrl, {
      requestId,
      resourceId,
    });
  } catch (error) {
    logger.error({
      requestId,
      resourceId,
      message: 'sprintCreateEvent: Error in creating sprint',
      error,
    });
    throw error;
  }
}
