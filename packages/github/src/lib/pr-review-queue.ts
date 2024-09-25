/* eslint-disable max-lines-per-function */
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { getPullRequestById } from './get-pull-request';

const sqsClient = SQSClient.getInstance();

export async function pRReviewOnQueue(
  pullRequestData: Github.ExternalType.Webhook.PullRequest,
  prReview: Github.ExternalType.Webhook.PRReview,
  pullId: number,
  repoId: number,
  orgId: string,
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
    await Promise.all([
      sqsClient.sendMessage(
        { review: prReview, pullId, repoId, action, orgId },
        Queue.qGhPrReviewFormat.queueUrl,
        { requestId, resourceId: String(pullId) }
      ),
      sqsClient.sendFifoMessage(
        {
          ...pullRequestData,
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
