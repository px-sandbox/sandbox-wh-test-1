import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { ChangelogField, ChangelogStatus, IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getOrganization } from '../../repository/organization/get-organization';
import { getIssueStatusForReopenRate } from '../../util/issue-status';
/**
 * Updates a Jira issue using webhook data.
 * @param issue The Jira issue to update.
 * @returns A Promise that resolves when the update is complete.
 */
export async function update(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {
  logger.info('issue_update_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...issue }, Queue.qIssueFormat.queueUrl);
  if (issue.issue.fields.issuetype.name !== IssuesTypes.BUG) {
    return;
  }
  const orgData = await getOrganization(issue.organization);
  const issueState = issue.changelog.items[0];
  if (orgData) {
    const issueStatus = await getIssueStatusForReopenRate(orgData.id);
    if (
      [issueStatus[ChangelogStatus.READY_FOR_QA], issueStatus[ChangelogStatus.QA_FAILED]].includes(
        issueState.to
      )
    ) {
      logger.info('issue_info_ready_for_QA_update_event: Send message to SQS');
      const typeOfChangelog =
        issueStatus[ChangelogStatus.READY_FOR_QA] == issueState.to
          ? ChangelogStatus.READY_FOR_QA
          : ChangelogStatus.QA_FAILED;
      await new SQSClient().sendMessage({ ...issue, typeOfChangelog }, Queue.qReOpenRate.queueUrl);
    }
  }
}
