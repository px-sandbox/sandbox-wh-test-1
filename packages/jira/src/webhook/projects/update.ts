import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import moment from 'moment';
import { JiraClient } from '../../lib/jira-client';
import { getProjectById } from '../../repository/project/get-project';
import { projectKeysMapper } from './mapper';

const sqsClient = SQSClient.getInstance();
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
  organization: string,
  requestId: string
): Promise<void | false> {
  const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
  const resourceId = project.id.toString();

  logger.info({
    requestId,
    message: 'projectUpdatedEvent',
    data: {
      projectKey: project.key,
      availableProjectKeys: projectKeys,
    },
    resourceId,
  });

  if (projectKeys.includes(project.key)) {
    logger.info({
      requestId,
      message: 'processProjectUpdatedEvent: Project not available in our system',
      resourceId,
    });
    return;
  }

  const projectIndexData = await getProjectById(project.id, organization, {
    requestId,
    resourceId,
  });
  if (!projectIndexData) {
    logger.info({ requestId, message: 'projectUpdatedEvent: Project not found', resourceId });
    return false;
  }
  const jiraClient = await JiraClient.getClient(organization);
  const projectData = await jiraClient.getProject(project.id.toString());
  const updatedAt = eventTime.toISOString();
  const updatedProjectBody: Jira.Mapped.Project = projectKeysMapper(
    projectData,
    projectIndexData.createdAt,
    organization,
    updatedAt
  );

  logger.info({
    requestId,
    message: 'processProjectUpdatedEvent: Send message to SQS',
    resourceId,
  });

  await sqsClient.sendMessage(updatedProjectBody, Queue.qProjectFormat.queueUrl, {
    requestId,
    resourceId,
  });
}
