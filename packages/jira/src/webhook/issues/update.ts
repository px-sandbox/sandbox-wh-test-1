import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import { getOrganization } from 'src/repository/organization/get-organization';
import { getIssueStatusForReopenRate } from 'src/util/issue-status';
import { Queue } from 'sst/node/queue';
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
      (issueState.toString === issueStatus[issueState.to]) ||
      (issueState.field === issueStatus[9999]) // for sprint change
    ) {
      logger.info('issue_info_ready_for_QA_update_event: Send message to SQS');
      const typeOfChangelog = issueStatus[issueState.to];
      await new SQSClient().sendMessage({ ...issue, typeOfChangelog }, Queue.qReOpenRate.queueUrl);
    }
  }
}