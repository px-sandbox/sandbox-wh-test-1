import moment from 'moment';
import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getWorkingTime } from '../util/timezone-calculation';
import { getPullRequestById } from './get-pull-request';
import { getTimezoneOfUser } from './get-user-timezone';

const sqsClient = SQSClientGh.getInstance();
export async function pROnQueue(
  pull: Github.ExternalType.Webhook.PullRequest,
  action: string
): Promise<void> {
  try {
    let reviewedAt = null;
    let approvedAt = null;
    let reviewSeconds = 0;
    const [pullData] = await getPullRequestById(pull.id);
    logger.info('ES : PR Data ', pullData);
    if (pullData) {
      if (action === Github.Enums.PullRequest.Opened) {
        logger.info('PR already exist');
        return;
      }
      if (pullData.reviewedAt) {
        reviewedAt = pullData.reviewedAt;
        reviewSeconds = pullData.reviewSeconds;
      }
      if (pullData.approvedAt) {
        approvedAt = pullData.approvedAt;
      }
      if (
        pull.merged === true &&
        action === Github.Enums.PullRequest.Closed &&
        pullData.reviewedAt === null
      ) {
        if (pull.user.id !== pull.merged_by?.id) {
          reviewedAt = pull.merged_at;
          const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
          reviewSeconds = getWorkingTime(
            moment(pull.created_at),
            moment(pull.merged_at),
            createdTimezone
          );
        }
      }
    }
    await sqsClient.sendMessage(
      {
        ...pull,
        reviewed_at: reviewedAt,
        approved_at: approvedAt,
        review_seconds: reviewSeconds,
        action,
      },
      Queue.qGhPrFormat.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
