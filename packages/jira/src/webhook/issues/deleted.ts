import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { Config } from 'sst/node/config';
import { getIssueById } from '../../repository/issue/get-issue';
import { saveIssueDetails } from '../../repository/issue/save-issue';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';
import { softDeleteCycleTimeDocument } from '../../repository/cycle-time/update';

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
  requestId: string,
  parentId?: string
): Promise<void | false> {
  const issueData = await getIssueById(issueId, organization, { requestId, resourceId: issueId });
  if (!issueData) {
    logger.info({ requestId, resourceId: issueId, message: 'issueDeletedEvent: Issue not found' });
    return false;
  }

  // checking if issue type is allowed

  if (!ALLOWED_ISSUE_TYPES.includes(issueData?.issueType)) {
    logger.info({ message: 'processIssueDeletedEvent: Issue type not allowed' });
    return;
  }

  // checking is project key is available in our system
  const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
  const projectKey = issueData?.projectKey;
  if (!projectKeys.includes(projectKey)) {
    logger.info({message: 'processIssueDeletedEvent: Project not available in our system'});
    return;
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

  // soft delete cycle time document
  await softDeleteCycleTimeDocument(issueId, issueData.issueType, parentId);
}
