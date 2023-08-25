/* eslint-disable camelcase */
import moment from 'moment';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../constant/config';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { getWorkingTime } from '../util/timezone-calculation';
import { getOctokitResp } from '../util/octokit-response';
import { ghRequest } from './request-default';
import { getPullRequestById } from './get-pull-request';
import { getTimezoneOfUser } from './get-user-timezone';

// Get token to pass into header of Github Api call
async function getGithubApiToken(): Promise<string> {
  const installationAccessToken = await getInstallationAccessToken();
  return `Bearer ${installationAccessToken.body.token}`;
}

// Get pull request details through Github Api and update the same into index.
async function getPullRequestDetails(
  repo: string,
  owner: string,
  pullNumber: number
): Promise<object> {
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: await getGithubApiToken(),
    },
  });

  const responseData = await octokit(`GET /repos/${owner}/${repo}/pulls/${pullNumber}`);
  const octokitRespData = getOctokitResp(responseData);
  return octokitRespData;
}

async function setReviewTime(
  pullData: {
    _id: string;
  } & Github.Type.PullRequestBody,
  prReview: Github.ExternalType.Webhook.PRReview
): Promise<{ approved_at: string | null; reviewed_at: string | null; review_seconds: number }> {
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
  return { approved_at, reviewed_at, review_seconds };
}

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

    const octokitRespData = await getPullRequestDetails(repo, owner, pullNumber);
    const { approved_at, reviewed_at, review_seconds } = await setReviewTime(pullData, prReview);

    await Promise.all([
      new SQSClient().sendMessage(
        { review: prReview, pullId, repoId, action },
        Queue.gh_pr_review_format.queueUrl
      ),
      new SQSClient().sendMessage(
        {
          ...octokitRespData,
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
