import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClientGh } from '@pulse/event-handler';
import { v4 as uuid } from 'uuid';
import { Queue } from 'sst/node/queue';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { JiraClient } from '../../lib/jira-client';

const sqsClient = SQSClientGh.getInstance();
/**
 * Creates a Jira issue and sends a message to SQS.
 * @param issue - The Jira issue to create.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {
  logger.info('issue_event: Send message to SQS');

  const jiraClient = await JiraClient.getClient(issue.organization);

  const issueData = await jiraClient.getIssue(issue.issue.id);

  logger.info('issue_event_for_project', { projectKey: issueData.fields.project.key });
  const projectData = await jiraClient.getProject(issueData.fields.project.id);

  // checking is project type is software. We dont wanna save maintainence projects
  logger.info('issue_event: Checking project type');
  if (projectData.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
    await sqsClient.sendFifoMessage(
      { ...issue },
      Queue.qIssueFormat.queueUrl,
      issue.issue.id,
      uuid()
    );
  }
}
