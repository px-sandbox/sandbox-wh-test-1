/* eslint-disable max-lines-per-function */
import moment from 'moment';
import { OctokitResponse } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { mappingPrefixes } from '../constant/config';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { getOctokitResp } from '../util/octokit-response';
import { getWorkingTime } from '../util/timezone-calculation';
import { getPullRequestById } from './get-pull-request';
import { getTimezoneOfUser } from './get-user-timezone';
import { ghRequest } from './request-default';

// Get token to pass into header of Github Api call
async function getGithubApiToken(orgName: string): Promise<string> {
  const installationAccessToken = await getInstallationAccessToken(orgName);
  return `Bearer ${installationAccessToken.body.token}`;
}

const sqsClient = SQSClient.getInstance();

// Get pull request details through Github Api and update the same into index.
async function getPullRequestDetails<T>(
  repo: string,
  owner: string,
  pullNumber: number
): Promise<OctokitResponse<T>> {
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: await getGithubApiToken(owner),
    },
  });
  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
  const responseData = (await octokitRequestWithTimeout(
    `GET /repos/${owner}/${repo}/pulls/${pullNumber}`
  )) as OctokitResponse<any>;
  const octokitRespData = getOctokitResp(responseData);
  return octokitRespData;
}

export async function pRReviewOnQueue(
  prReview: Github.ExternalType.Webhook.PRReview,
  pullId: number,
  repoId: number,
  repo: string,
  owner: string,
  orgId: string,
  pullNumber: number,
  action: string,
  requestId: string
): Promise<void> {
  try {
    /**
     * Search pull request index and check if reviewed_at and approved_at is null or not. If null then
     * update the value to store the first reviewed_at and approved_at time.
     */
    const [pullData] = await getPullRequestById(pullId);
    if (!pullData) {
      logger.error({
        message: 'pRReviewOnQueue.failed: PR NOT FOUND',
        data: {
          review: prReview,
          pullId,
          repoId,
          action,
        },
        requestId,
        resourceId: String(pullId),
      });
      return;
    }

    const octokitRespData = await getPullRequestDetails(repo, owner, pullNumber);

    await Promise.all([
      sqsClient.sendMessage(
        { review: prReview, pullId, repoId, action, orgId },
        Queue.qGhPrReviewFormat.queueUrl,
        { requestId, resourceId: String(pullId) }
      ),
      sqsClient.sendFifoMessage(
        {
          ...octokitRespData,
          review: {
            user: prReview.user,
            submitted_at: prReview.submitted_at,
            state: prReview.state,
          },
          action: Github.Enums.PullRequest.ReviewSubmitted,
        },
        Queue.qGhPrFormat.queueUrl,
        {
          requestId,
          resourceId: String(pullId),
        },
        String(pullId),
        uuid()
      ),
    ]);
  } catch (error: unknown) {
    logger.error({
      message: 'pRReviewOnQueue.Error',
      requestId,
      resourceId: String(pullId),
      error,
    });
    throw error;
  }
}
