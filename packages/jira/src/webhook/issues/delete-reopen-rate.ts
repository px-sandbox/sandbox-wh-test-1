import { SQSClientGh } from '@pulse/event-handler';
import { v4 as uuid } from 'uuid';
import { Jira } from 'abstraction';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClientGh.getInstance();
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
  eventTime: moment.Moment
): Promise<void | false> {
  try {
    // await new SQSClient().sendMessage({ ...issue, eventTime }, Queue.qReOpenRateDelete.queueUrl);
    // TODO: Check specifically for this event
    sqsClient.sendFifoMessage(
      { ...issue, eventTime },
      Queue.qReOpenRateDelete.queueUrl,
      issue.issue.id,
      uuid()
    );
  } catch (error) {
    logger.error(`removeReopenRate.error, ${error}`);
  }
}
