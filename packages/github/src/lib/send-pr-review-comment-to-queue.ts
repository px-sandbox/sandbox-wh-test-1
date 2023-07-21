import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getWorkingTime } from 'src/util/timezone-calculation';
import moment from 'moment';
import { ghRequest } from './request-defaults';
import { getPullRequestById } from './get-pull-request';
import { getTimezoneOfUser } from './get-user-timezone';

export async function pRReviewCommentOnQueue(
  prReviewComment: Github.ExternalType.Webhook.PRReviewComment,
  pullId: number,
  repoId: number,
  repo: string,
  owner: string,
  pullNumber: number,
  action: string
): Promise<void> {
  try {
    //Get token to pass into header of Github Api call
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });

    //Get pull request details through Github Api and update the same into index.
    const responseData = await octokit(`GET /repos/${owner}/${repo}/pulls/${pullNumber}`);

    //
    let reviewed_at = null;
    let approved_at = null;
    let review_seconds = 0;
    /**
     * Search pull request index and check if reviewed_at is null or not. If null then
     * update the value to store the first reviewed_at time. Also this commented shouldn't
     * be by Github Bot. If comment is from Github Bob then we will not update reviewed_at.
     */
    const [pullData] = await getPullRequestById(pullId);
    if (pullData) {
      if (pullData.reviewedAt === null && prReviewComment.user.type !== Github.Enums.UserType.BOT) {
        reviewed_at = prReviewComment.created_at;
        const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
        review_seconds = getWorkingTime(
          moment(pullData.createdAt),
          moment(reviewed_at),
          createdTimezone
        );
      }
      if (pullData.approvedAt !== null) {
        approved_at = pullData.approvedAt;
      }
      await Promise.all([
        new SQSClient().sendMessage(
          { comment: prReviewComment, pullId: pullId, repoId: repoId, action: action },
          Queue.gh_pr_review_comment_format.queueUrl
        ),
        new SQSClient().sendMessage(
          {
            ...responseData.data,
            reviewed_at,
            approved_at,
            review_seconds,
            action: Github.Enums.Comments.PR_COMMENTED,
          },
          Queue.gh_pr_format.queueUrl
        ),
      ]);
    }
    logger.error('pRReviewCommentOnQueue.failed: PR NOT FOUND', {
      review: prReviewComment,
      pullId: pullId,
      repoId: repoId,
      action: action,
    });
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
