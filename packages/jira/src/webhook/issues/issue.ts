import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { logger } from 'core';
import { formatIssueNew } from 'src/util/issue-helper';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';
import { getOrganization } from 'src/repository/organization/get-organization';

const sqsClient = SQSClient.getInstance();

function isAllowedProjectOrIssueType(
  projectKey: string,
  projectTypeKey: string,
  issueTypeName: string
) {
  const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
  if (!ALLOWED_ISSUE_TYPES.includes(issueTypeName)) {
    logger.info({ message: 'Issue: Create => Issue type is not among allowed values' });
    return;
  } else if (
    projectKeys.includes(projectKey) ||
    projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE
  ) {
    logger.info({
      message:
        'Issue: Create => Either the project is not allowed or we do not support this project type',
    });
    // return;
  }
}
export async function create(
  issue: Jira.ExternalType.Webhook.newIssue,
  eventTime: string,
  organization: string,
  requestId: string
) {
  const {
    id,
    key,
    fields: {
      project,
      issuetype: { name: issueTypeName },
    },
  } = issue;

  isAllowedProjectOrIssueType(project.key, project.projectTypeKey, issueTypeName);
  const orgId = await getOrganization(organization);
  if (!orgId) {
    throw new Error(`worklog.hanlder.organization ${organization} not found`);
  }
  const issueData = await formatIssueNew(issue, orgId);

  await sqsClient.sendFifoMessage(
    { eventName: Jira.Enums.Event.IssueCreated, issueData, eventTime, organization },
    Queue.qIssueFormat.queueUrl,
    { requestId, resourceId: id },
    key,
    uuid()
  );
}

export async function update(
  changelog: Jira.ExternalType.Webhook.ChangelogItem[],
  issueData: Jira.ExternalType.Webhook.IssueUpdate,
  eventTime: string,
  organization: string,
  requestId: string
) {
  const {
    id,
    key,
    fields: {
      project,
      issuetype: { name: issueTypeName },
    },
  } = issueData;

  isAllowedProjectOrIssueType(project.key, project.projectTypeKey, issueTypeName);

  await sqsClient.sendFifoMessage(
    {
      eventName: Jira.Enums.Event.IssueUpdated,
      issueInfo: { id, key, issueType: issueTypeName },
      changelog,
      eventTime,
      organization,
    },
    Queue.qIssueFormat.queueUrl,
    { requestId, resourceId: id },
    key,
    uuid()
  );
}

export async function deleted(
  issue: Jira.ExternalType.Webhook.Issue,
  eventTime: string,
  organization: string,
  requestId: string
) {
  const {
    issue: {
      id: resourceId,
      key: issueKey,
      fields: {
        project,
        issuetype: { name: issueTypeName },
      },
    },
  } = issue;

  const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];

  if (!ALLOWED_ISSUE_TYPES.includes(issueTypeName)) {
    logger.info({ message: 'Issue: Update => Issue type is not among allowed values' });
    return;
  } else if (
    projectKeys.includes(project.key) ||
    project.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE
  ) {
    logger.info({
      message:
        'Issue: Update => Either the project is not allowed or we do not support this project type',
    });
    return;
  }

  await sqsClient.sendFifoMessage(
    {
      eventName: 'issue.delete',
      issueInfo: { id: resourceId, issueKey, issueType: issueTypeName },
      eventTime,
      organization,
    },
    Queue.qIssueFormat.queueUrl,
    { requestId, resourceId },
    issueKey,
    uuid()
  );
}

// /**
//  * Creates a Jira issue and sends a message to SQS.
//  * @param issue - The Jira issue to create.
//  * @returns A Promise that resolves when the message is sent to SQS.
//  */
// export async function issueHandler(
//   issue: Jira.ExternalType.Webhook.Issue,
//   requestId: string
// ): Promise<void> {
//   const resourceId = issue.issue.id;
//   const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
//   const { project } = issue.issue.fields;

//   logger.info({
//     requestId,
//     resourceId,
//     message: 'issue_event.Send_message_to_SQS',
//   });

//   if (issue.issue.fields.issuetype.name === IssuesTypes.TEST) {
//     logger.info({ message: 'processIssueCreatedEvent: Issue type TEST is not allowed' });
//     return;
//   }
//   if (!ALLOWED_ISSUE_TYPES.includes(issue.issue.fields.issuetype.name)) {
//     logger.info({ message: 'processIssueCreatedEvent: Issue type not allowed' });
//     return;
//   }

//   // checking is project key is available in our system
//   if (projectKeys.includes(project.key)) {
//     logger.info({ message: 'processIssueCreatedEvent: Project not available in our system' });
//     return;
//   }

//   // checking is project type is software.
//   logger.info({
//     requestId,
//     resourceId,
//     message: 'issue_event.Checking_project_type',
//   });

//   if (project.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
//     await sqsClient.sendFifoMessage(
//       { ...issue },
//       Queue.qIssueFormat.queueUrl,
//       { requestId, resourceId },
//       issue.issue.key,
//       uuid()
//     );

//     await sqsClient.sendFifoMessage(
//       { ...issue },
//       Queue.qCycleTimeFormat.queueUrl,
//       { requestId, resourceId },
//       issue.issue.key,
//       uuid()
//     );
//   }
// }
