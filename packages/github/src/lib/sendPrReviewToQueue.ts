import moment from 'moment';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../constant/config';
import { getInstallationAccessToken } from '../util/installationAccessTokenGenerator';
import { getWorkingTime } from '../util/timezoneCalculation';
import { ghRequest } from './requestDefaults';
import { getPullRequestById } from './getPullRequest';
import { getTimezoneOfUser } from './getUserTimezone';

export async function pRReviewOnQueue(
  prReview: Github.ExternalType.Webhook.PRReview,
  pullId: number,
  repoId: number,
  repo: string,
  owner: string,
  pullNumber: number,
  action: string
): Promise<void> {
  try {
    // Get token to pass into header of Github Api call
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });

    // Get pull request details through Github Api and update the same into index.
    const responseData = await octokit(`GET /repos/${owner}/${repo}/pulls/${pullNumber}`);

    /**
     * Search pull request index and check if reviewed_at and approved_at is null or not. If null then
     * update the value to store the first reviewed_at and approved_at time.
     */

    const [pullData] = await getPullRequestById(pullId);
    if (!pullData) {
      logger.error('pRReviewOnQueue.failed: PR NOT FOUND', {
        review: prReview,
        pullId,
        repoId,
        action,
      });
      return;
    }

    let approved_at = pullData.approvedAt;
    let reviewed_at = pullData.reviewedAt;
    let review_seconds = pullData.reviewSeconds;

    if (
      !reviewed_at &&
      pullData.pRCreatedBy !== `${mappingPrefixes.user}_${prReview.user.id}` &&
      prReview.user.type !== Github.Enums.UserType.BOT
    ) {
      reviewed_at = prReview.submitted_at;
      const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
      review_seconds = getWorkingTime(
        moment(pullData.createdAt),
        moment(reviewed_at),
        createdTimezone
      );
    }

    if (!approved_at && prReview.state === Github.Enums.ReviewState.APPROVED) {
      approved_at = prReview.submitted_at;
    }

    await Promise.all([
      new SQSClient().sendMessage(
        { review: prReview, pullId, repoId, action },
        Queue.gh_pr_review_format.queueUrl
      ),
      new SQSClient().sendMessage(
        {
          ...responseData.data,
          reviewed_at,
          approved_at,
          review_seconds,
          action: Github.Enums.Comments.REVIEW_COMMENTED,
        },
        Queue.gh_pr_format.queueUrl
      ),
    ]);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
