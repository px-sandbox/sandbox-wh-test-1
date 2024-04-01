import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClientGh } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import moment from 'moment';
import { getProjectById } from '../../repository/project/get-project';
import { projectKeysMapper } from './mapper';

const sqsClient = SQSClientGh.getInstance();
/**
 * Updates a Jira project using the provided webhook data.
 * @param project - The project data received from the webhook.
 * @param eventTime - The time the webhook event occurred.
 * @param organization - The organization associated with the project.
 * @returns A Promise that resolves with void if the project was successfully updated,
 *  or false if the project was not found.
 */
export async function update(
  project: Jira.ExternalType.Webhook.Project,
  eventTime: moment.Moment,
  organization: string
): Promise<void | false> {
  const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];

  logger.info('projectUpdatedEvent', {
    projectKey: project.key,
    availableProjectKeys: projectKeys,
  });

  if (!projectKeys.includes(project.key)) {
    logger.info('processProjectUpdatedEvent: Project not available in our system');
    return;
  }

  const projectIndexData = await getProjectById(project.id, organization);
  if (!projectIndexData) {
    logger.info('projectUpdatedEvent: Project not found');
    return false;
  }

  const updatedAt = eventTime.toISOString();
  const updatedProjectBody: Jira.Mapped.Project = projectKeysMapper(
    project,
    projectIndexData.createdAt,
    organization,
    updatedAt
  );

  logger.info('processProjectUpdatedEvent: Send message to SQS');

  await sqsClient.sendMessage(updatedProjectBody, Queue.qProjectFormat.queueUrl);
}
