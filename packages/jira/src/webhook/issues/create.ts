import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { v4 as uuid } from 'uuid';
import { Queue } from 'sst/node/queue';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { IssuesTypes } from 'abstraction/jira/enums';
import { JiraClient } from '../../lib/jira-client';

const sqsClient = SQSClient.getInstance();
/**
 * Creates a Jira issue and sends a message to SQS.
 * @param issue - The Jira issue to create.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(
  issue: Jira.ExternalType.Webhook.Issue,
  requestId: string
): Promise<void> {
  if (issue.issue.fields.issuetype.name === IssuesTypes.TEST) {
    return;
  }
  const resourceId = issue.issue.id;
  logger.info({
    requestId,
    resourceId,
    message: 'issue_event.Send_message_to_SQS',
  });

  const jiraClient = await JiraClient.getClient(issue.organization);

  const issueData = await jiraClient.getIssue(issue.issue.id);

  logger.info({
    requestId,
    resourceId,
    message: 'issue_event.Getting_project_data',
  });
  const projectData = await jiraClient.getProject(issueData.fields.project.id);

  // checking is project type is software. We dont wanna save maintainence projects
  logger.info({
    requestId,
    resourceId,
    message: 'issue_event.Checking_project_type',
  });
  if (projectData.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
    await sqsClient.sendFifoMessage(
      { ...issue },
      Queue.qIssueFormat.queueUrl,
      { requestId, resourceId },
      issue.issue.key,
      uuid()
    );
  }
}
