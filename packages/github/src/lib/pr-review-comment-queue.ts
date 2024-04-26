import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { getPullRequestById } from './get-pull-request';

const sqsClient = SQSClient.getInstance();
export async function pRReviewCommentOnQueue(
  prReviewComment: Github.ExternalType.Webhook.PRReviewComment,
  pullId: number,
  repoId: number,
  action: string,
  pullRequestData: Github.ExternalType.Webhook.PullRequest,
  requestId: string
): Promise<void> {
  try {
    /**
     * Search pull request index and check if reviewed_at is null or not. If null then
     * update the value to store the first reviewed_at time. Also this commented shouldn't
     * be by Github Bot. If comment is from Github Bob then we will not update reviewed_at.
     */
    const [pullData] = await getPullRequestById(pullId);
    if (!pullData) {
      logger.error({
        message: 'pRReviewCommentOnQueue.failed: PR NOT FOUND', data: {
          review: prReviewComment,
          pullId,
          repoId,
          action,
        }, requestId, resourceId: String(pullId),
      });
      return;
    }
    await Promise.all([
      sqsClient.sendMessage(
        { comment: prReviewComment, pullId, repoId, action },
        Queue.qGhPrReviewCommentFormat.queueUrl,
        {requestId, resourceId: String(pullId)}
      ),
      sqsClient.sendFifoMessage(
        {
          ...pullRequestData,
          reviewed_at: pullData.reviewedAt,
          approved_at: pullData.approvedAt,
          review_seconds: pullData.reviewSeconds,
        },
        Queue.qGhPrFormat.queueUrl,
        { requestId, resourceId: String(pullId)},
        String(pullId),
        uuid(),
      ),
    ]);
  } catch (error: unknown) {
    logger.error({message:"Error in pRReviewCommentOnQueue", requestId,resourceId: String(pullId), error});
    throw error;
  }
}
