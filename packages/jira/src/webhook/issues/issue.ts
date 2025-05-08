import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { IssuesTypes } from 'abstraction/jira/enums';
import { formatIssueNew } from '../../util/issue-helper';
import { getOrganization } from '../../repository/organization/get-organization';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';
import { getIssueById } from '../../repository/issue/get-issue';

const sqsClient = SQSClient.getInstance();

function isAllowedProjectOrIssueType(
  projectKey: string,
  projectTypeKey: string,
  issueTypeName: string
): boolean {
  const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
  if (!ALLOWED_ISSUE_TYPES.includes(issueTypeName)) {
    logger.info({ message: 'Issue: Create => Issue type is not among allowed values' });
    return false;
  }
  if (
    projectKeys.includes(projectKey) ||
    projectTypeKey.toLowerCase() !== ProjectTypeKey.SOFTWARE
  ) {
    logger.info({
      message:
        'Issue: Create => Either the project is not allowed or we do not support this project type',
    });
    return false;
  }
  return true;
}
export async function create(
  issue: Jira.ExternalType.Webhook.Issue,
  eventTime: string,
  organization: string,
  requestId: string
): Promise<void> {
  const {
    id,
    key,
    fields: {
      project,
      issuetype: { name: issueTypeName },
    },
  } = issue;

  const isAllowedProjectOrIssue = isAllowedProjectOrIssueType(
    project.key,
    project.projectTypeKey,
    issueTypeName
  );
  if (!isAllowedProjectOrIssue) {
    return;
  }
  const orgId = await getOrganization(organization);
  if (!orgId) {
    throw new Error(`worklog.hanlder.organization ${organization} not found`);
  }
  const issueData = await formatIssueNew(issue, orgId);
  if (issueData.body.issueType === IssuesTypes.SUBTASK && issueData.body.parent.id) {
    // get parent issue data form body.parent.id
    const parentId = issueData.body.parent.id.replace('jira_issue_', '');
    const parentIssue = await getIssueById(parentId, organization, { requestId, resourceId: id });
    // update the subtask fixVersion with parent issue fixVersion
    if (parentIssue.fixVersion) {
      issueData.body.fixVersion = parentIssue.fixVersion;
      logger.info({
        message: 'subtask.fixVersion.updated',
        data: {
          subtaskId: issueData.id,
          parentFixVersion: parentIssue.fixVersion,
        },
      });
    }
  }
  await sqsClient.sendFifoMessage(
    { eventName: Jira.Enums.Event.IssueCreated, issueData, eventTime, organization },
    Queue.qIssueFormat.queueUrl,
    { requestId, resourceId: id },
    key,
    uuid()
  );

  await sqsClient.sendFifoMessage(
    { issue, eventTime, organization },
    Queue.qCycleTimeFormat.queueUrl,
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
): Promise<void> {
  const {
    id,
    key,
    fields: {
      project,
      issuetype: { name: issueTypeName },
    },
  } = issueData;

  const isAllowedProjectOrIssue = isAllowedProjectOrIssueType(
    project.key,
    project.projectTypeKey,
    issueTypeName
  );
  if (!isAllowedProjectOrIssue) {
    return;
  }

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
  // update cycle time
  await sqsClient.sendFifoMessage(
    { issue: issueData, changelog, eventTime, organization },
    Queue.qCycleTimeFormat.queueUrl,
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
): Promise<void> {
  const {
    id,
    key,
    fields: {
      project,
      issuetype: { name: issueTypeName },
    },
  } = issue;
  const isAllowedProjectOrIssue = isAllowedProjectOrIssueType(
    project.key,
    project.projectTypeKey,
    issueTypeName
  );
  if (!isAllowedProjectOrIssue) {
    return;
  }

  await sqsClient.sendFifoMessage(
    {
      eventName: Jira.Enums.Event.IssueDeleted,
      issueInfo: issue,
      eventTime,
      organization,
    },
    Queue.qIssueFormat.queueUrl,
    { requestId, resourceId: id },
    key,
    uuid()
  );
}
