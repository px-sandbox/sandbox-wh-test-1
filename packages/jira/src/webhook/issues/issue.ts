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
  issue: Jira.ExternalType.Webhook.Issue,
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

  await sqsClient.sendFifoMessage(
    { issue: issue, eventTime, organization },
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
  //update cycle time
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
