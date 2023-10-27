import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { getProjectById } from '../../repository/project/get-project';
import { projectKeysMapper } from './mapper';


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
  const projectIndexData = await getProjectById(project.id);
  if (!projectIndexData) {
    logger.info('projectUpdatedEvent: Project not found');
    return false;
  }
  const updatedAt = moment(eventTime).toISOString();
  const updatedProjectBody: Jira.Mapped.Project = projectKeysMapper(
    project,
    projectIndexData.createdAt,
    organization,
    updatedAt
  );

  logger.info('processProjectUpdatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(updatedProjectBody, Queue.jira_project_format.queueUrl);
}
