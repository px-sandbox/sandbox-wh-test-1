import moment from 'moment';
import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { mappingPrefixes } from '../constant/config';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { getWorkingTime } from '../util/timezone-calculation';
import { getOctokitResp } from '../util/octokit-response';
import { ghRequest } from './request-default';
import { getPullRequestById } from './get-pull-request';
import { getTimezoneOfUser } from './get-user-timezone';
import { v4 as uuid } from 'uuid';
// Get token to pass into header of Github Api call
async function getGithubApiToken(): Promise<string> {
  const installationAccessToken = await getInstallationAccessToken();
  return `Bearer ${installationAccessToken.body.token}`;
}

const sqsClient = SQSClientGh.getInstance();

// Get pull request details through Github Api and update the same into index.
async function getPullRequestDetails<T>(
  repo: string,
  owner: string,
  pullNumber: number
): Promise<OctokitResponse<T>> {
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
  let { approvedAt, reviewedAt, reviewSeconds } = pullData;
  if (
    !reviewedAt &&
    pullData.pRCreatedBy !== `${mappingPrefixes.user}_${prReview.user.id}` &&
    prReview.user.type !== Github.Enums.UserType.BOT
  ) {
    reviewedAt = prReview.submitted_at;
    const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
    reviewSeconds = getWorkingTime(moment(pullData.createdAt), moment(reviewedAt), createdTimezone);
  }

  if (!approvedAt && prReview.state === Github.Enums.ReviewState.APPROVED) {
    approvedAt = prReview.submitted_at;
  }
  return { approved_at: approvedAt, reviewed_at: reviewedAt, review_seconds: reviewSeconds };
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
    const {
      approved_at: approvedAt,
      reviewed_at: reviewedAt,
      review_seconds: reviewSeconds,
    } = await setReviewTime(pullData, prReview);

    await Promise.all([
      sqsClient.sendMessage(
        { review: prReview, pullId, repoId, action },
        Queue.qGhPrReviewFormat.queueUrl
      ),
      sqsClient.sendMessage(
        {
          ...octokitRespData,
          reviewed_at: reviewedAt,
          approved_at: approvedAt,
          review_seconds: reviewSeconds,
          action: Github.Enums.Comments.REVIEW_COMMENTED,
        },
        Queue.qGhPrFormat.queueUrl,
        String(pullId),
        uuid()
      ),
    ]);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
