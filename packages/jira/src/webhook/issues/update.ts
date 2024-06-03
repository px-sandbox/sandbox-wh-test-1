import { SQSClient } from '@pulse/event-handler';
import { v4 as uuid } from 'uuid';
import { Jira } from 'abstraction';
import { ChangelogStatus, IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { getOrganization } from '../../repository/organization/get-organization';
import { getIssueStatusForReopenRate } from '../../util/issue-status';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';

const sqsClient = SQSClient.getInstance();
/**
 * Updates a Jira issue using webhook data.
 * @param issue The Jira issue to update.
 * @returns A Promise that resolves when the update is complete.
 */
export async function update(
  issue: Jira.ExternalType.Webhook.Issue,
  requestId: string
): Promise<void> {
  if (issue.issue.fields.issuetype.name === IssuesTypes.TEST) {
    return;
  }
  const resourceId = issue.issue.id;
  logger.info({ requestId, resourceId, message: 'issue_update_event: Send message to SQS' });

  // checking if issue type is allowed

  if (!ALLOWED_ISSUE_TYPES.includes(issue.issue.fields.issuetype.name)) {
    logger.info('processIssueUpdatedEvent: Issue type not allowed');
    return;
  }

  // checking is project key is available in our system
  const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
  const projectKey = issue.issue.fields.project.key;
  if (!projectKeys.includes(projectKey)) {
    logger.info('processIssueUpdatedEvent: Project not available in our system ');
    return;
  }

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

  if (issue.issue.fields.issuetype.name !== IssuesTypes.BUG) {
    return;
  }
  const orgData = await getOrganization(issue.organization);
  const issueState = issue.changelog.items[0];
  if (orgData) {
    const issueStatus = await getIssueStatusForReopenRate(orgData.id, { requestId, resourceId });
    if (
      [issueStatus[ChangelogStatus.READY_FOR_QA], issueStatus[ChangelogStatus.QA_FAILED]].includes(
        issueState.to
      )
    ) {
      logger.info({
        requestId,
        resourceId,
        message: 'issue_info_ready_for_QA_update_event: Send message to SQS',
      });
      const typeOfChangelog =
        issueStatus[ChangelogStatus.READY_FOR_QA] === issueState.to
          ? ChangelogStatus.READY_FOR_QA
          : ChangelogStatus.QA_FAILED;

      await sqsClient.sendMessage({ ...issue, typeOfChangelog }, Queue.qReOpenRate.queueUrl, {
        requestId,
        resourceId,
      });
    }
  }
}
