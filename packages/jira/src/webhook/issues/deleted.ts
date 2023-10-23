import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { getIssueById } from '../../repository/issue/get-issue';
import { saveIssueDetails } from '../../repository/issue/save-issue';


export async function remove(issueId: string, eventTime: moment.Moment): Promise<void | false> {
  const issueData = await getIssueById(issueId);
  if (!issueData) {
    logger.info('issueDeletedEvent: Issue not found');
    return false;
  }
  const { _id, ...processIssue } = issueData;

  processIssue.isDeleted = true;
  processIssue.deletedAt = moment(eventTime).toISOString();

  logger.info(`issueDeletedEvent: Delete Issue id ${_id}`);
  await saveIssueDetails({ id: _id, body: processIssue } as Jira.Type.Issue);
}