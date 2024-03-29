import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { JiraClient } from '../../lib/jira-client';
import { projectKeysMapper } from './mapper';

const sqsClient = SQSClient.getInstance();
/**
 * Creates a new Jira project and sends a message to SQS queue.
 * @param project - The Jira project to be created.
 * @param eventTime - The time when the project was created.
 * @param organization - The organization to which the project belongs.
 * @returns A Promise that resolves when the message is sent to the SQS queue.
 */
export async function create(
  project: Jira.ExternalType.Webhook.Project,
  eventTime: moment.Moment,
  organization: string
): Promise<void> {
  // getting jira client and fetching project data using api
  const jiraClient = await JiraClient.getClient(organization);
  const projectData = await jiraClient.getProject(project.id.toString());

  // checking is project type is software. We dont wanna save maintainence projects

  logger.info('processProjectCreatedEvent: Checking project type');
  if (projectData.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
    const createdAt = moment(eventTime).toISOString();
    const updatedProjectBody = projectKeysMapper(projectData, createdAt, organization);
    logger.info('processProjectCreatedEvent: Send message to SQS');
    // await new SQSClient().sendMessage(updatedProjectBody, Queue.qProjectFormat.queueUrl);
    sqsClient.sendMessage(updatedProjectBody, Queue.qProjectFormat.queueUrl);
  }
}
