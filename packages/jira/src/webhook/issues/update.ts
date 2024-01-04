import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { getOrganization } from 'src/repository/organization/get-organization';
import { getFailedStatusDetails, getReadyForQAStatusDetails } from 'src/util/issue-status';
import { Queue } from 'sst/node/queue';

/**
 * Updates a Jira issue using webhook data.
 * @param issue The Jira issue to update.
 * @returns A Promise that resolves when the update is complete.
 */
export async function update(issue: Jira.ExternalType.Webhook.Issue): Promise<void> {
  logger.info('issue_update_event: Send message to SQS');
  await new SQSClient().sendMessage({ ...issue }, Queue.qIssueFormat.queueUrl);

  // Save data to reopen rate index
  if (issue.changelog && issue.changelog.items.length > 0) {
    const orgData = await getOrganization(issue.organization);
    if (orgData) {
      const [readyForQa, QaFailed] = await Promise.all([
        getReadyForQAStatusDetails(orgData.id),
        getFailedStatusDetails(orgData.id),
      ]);
      if (
        (issue.changelog.items[0].to == readyForQa.issueStatusId &&
          issue.changelog.items[0].toString === readyForQa.name) ||
        (issue.changelog.items[0].to == QaFailed.issueStatusId &&
          issue.changelog.items[0].toString === QaFailed.name)
      ) {
        logger.info('issue_info_ready_for_QA_update_event: Send message to SQS');
        await new SQSClient().sendMessage({ ...issue }, Queue.qReOpenRate.queueUrl);
      }
    }
  }
}
