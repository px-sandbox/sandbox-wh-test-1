import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { getIssueById } from '../../repository/issue/get-issue';
import { saveIssueDetails } from '../../repository/issue/save-issue';

/**
 * Removes the issue with the given ID and marks it as deleted.
 * @param issueId - The ID of the issue to be removed.
 * @param eventTime - The time when the issue was deleted.
 * @param organization - The organization the issue belongs to.
 * @returns A Promise that resolves with void if the issue was successfully removed,
 *  or false if the issue was not found.
 */
export async function remove(
  issueId: string,
  eventTime: moment.Moment,
  organization: string,
  requestId: string
): Promise<void | false> {
  const issueData = await getIssueById(issueId, organization, { requestId, resourceId: issueId });
  if (!issueData) {
    logger.info({ requestId, resourceId: issueId, message: 'issueDeletedEvent: Issue not found' });
    return false;
  }
  const { _id, ...processIssue } = issueData;

  processIssue.isDeleted = true;
  processIssue.deletedAt = moment(eventTime).toISOString();

  logger.info({
    requestId,
    resourceId: issueId,
    message: `issueDeletedEvent: Delete Issue id ${_id}`,
  });
  await saveIssueDetails({ id: _id, body: processIssue } as Jira.Type.Issue, {
    requestId,
    resourceId: issueId,
  });
}
