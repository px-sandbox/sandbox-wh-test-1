import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';

const sqsClient = SQSClient.getInstance();
/**
 * Creates a Jira issue and sends a message to SQS.
 * @param issue - The Jira issue to create.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function issueHandler(
  issue: Jira.ExternalType.Webhook.Issue,
  requestId: string
): Promise<void> {
  const resourceId = issue.issue.id;
  const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
  const { project } = issue.issue.fields;

  logger.info({
    requestId,
    resourceId,
    message: 'issue_event.Send_message_to_SQS',
  });

  if (issue.issue.fields.issuetype.name === IssuesTypes.TEST) {
    logger.info({ message: 'processIssueCreatedEvent: Issue type TEST is not allowed' });
    return;
  }
  if (!ALLOWED_ISSUE_TYPES.includes(issue.issue.fields.issuetype.name)) {
    logger.info({ message: 'processIssueCreatedEvent: Issue type not allowed' });
    return;
  }

  // checking is project key is available in our system
  if (projectKeys.includes(project.key)) {
    logger.info({ message: 'processIssueCreatedEvent: Project not available in our system' });
    return;
  }

  // checking is project type is software.
  logger.info({
    requestId,
    resourceId,
    message: 'issue_event.Checking_project_type',
  });

  if (project.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
    await sqsClient.sendFifoMessage(
      { ...issue },
      Queue.qIssueFormat.queueUrl,
      { requestId, resourceId },
      issue.issue.key,
      uuid()
    );

    await sqsClient.sendFifoMessage(
      { ...issue },
      Queue.qCycleTimeFormat.queueUrl,
      { requestId, resourceId },
      issue.issue.key,
      uuid()
    );
  }
}
