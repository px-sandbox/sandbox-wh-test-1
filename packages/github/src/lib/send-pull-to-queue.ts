import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getWorkingTime } from 'src/util/timezone-calculation';
import moment from 'moment';
import { getPullRequestById } from './get-pull-request';
import { getTimezoneOfUser } from './get-user-timezone';

export async function pROnQueue(
  pull: Github.ExternalType.Webhook.PullRequest,
  action: string
): Promise<void> {
  try {
    let reviewed_at = null;
    let approved_at = null;
    let review_seconds = 0;
    const [pullData] = await getPullRequestById(pull.id);

    if (pullData) {
      if (pullData.reviewedAt) {
        reviewed_at = pullData.reviewedAt;
        review_seconds = pullData.reviewSeconds;
      }
      if (pullData.approvedAt) {
        approved_at = pullData.approvedAt;
      }
      if (
        pull.merged === true &&
        action === Github.Enums.PullRequest.Closed &&
        pullData.reviewedAt === null
      ) {
        if (pull.user.id !== pull.merged_by?.id) {
          reviewed_at = pull.merged_at;
          const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
          review_seconds = getWorkingTime(
            moment(pull.created_at),
            moment(pull.merged_at),
            createdTimezone
          );
        }
      }
    }
    await new SQSClient().sendMessage(
      { ...pull, reviewed_at, approved_at, review_seconds, action },
      Queue.gh_pr_format.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
