import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { JiraClient } from '../../lib/jira-client';

/**
 * Creates a Jira issue and sends a message to SQS.
 * @param issue - The Jira issue to create.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export async function create(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {

  logger.info('issue_event: Send message to SQS');

  const projectKeys = Config.AVAILABLE_PROJECT_KEYS ? Config.AVAILABLE_PROJECT_KEYS.split(',') : [];
  logger.info('issue_event:available_project_keys', { projectKeys });
  const jiraClient = await JiraClient.getClient(issue.organization);

  const issueData = await jiraClient.getIssue(issue.issue.id);

  // We wanna make sure that only those issues are saved whose project is available in our system
  if (projectKeys.length > 0 && projectKeys.includes(issueData.fields.project.key)) {
    logger.info('issue_event_for_project', { projectKey: issueData.fields.project.key });
    const projectData = await jiraClient.getProject(issueData.fields.project.id);

    // checking is project type is software. We dont wanna save maintainence projects
    logger.info('issue_event: Checking project type');
    if (projectData.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
      await new SQSClient().sendMessage({ ...issue }, Queue.qIssueFormat.queueUrl);
    }
  } else {
    logger.info('issue_event: Project not available in our system');
  }


}
