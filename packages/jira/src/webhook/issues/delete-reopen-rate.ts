import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';

const sqsClient = SQSClient.getInstance();
/**
 * Removes the reopen issue with the given ID and marks it as deleted.
 * @param issueId - The ID of the issue to be removed.
 * @param eventTime - The time when the issue was deleted.
 * @param organization - The organization the issue belongs to.
 * @returns A Promise that resolves with void if the issue was successfully removed,
 *  or false if the issue was not found.
 */
export async function removeReopenRate(
  issue: (Pick<Hit, '_id'> & HitBody) | Jira.Mapped.ReopenRateIssue,
  eventTime: moment.Moment,
  requestId: string
): Promise<void | false> {

  // checking if issue type is allowed

  if (!ALLOWED_ISSUE_TYPES.includes(issue?.issue?.fields?.issuetype?.name)) {
    logger.info({message: 'processDeleteReopenRateEvent: Issue type not allowed'});
    return;
  }

  // checking is project key is available in our system
  const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
  const projectKey = issue?.issue?.fields?.project?.key;
  if (!projectKeys.includes(projectKey)) {
    logger.info({message: 'processDeleteReopenRateEvent: Project not available in our system'});
    return;
  }


  const resourceId = issue.issue.id;

  try {
    await sqsClient.sendMessage({ ...issue, eventTime }, Queue.qReOpenRateDelete.queueUrl, {
      requestId,
      resourceId,
    });
  } catch (error) {
    logger.error({ requestId, resourceId, message: 'removeReopenRate.error', error });
  }
}
