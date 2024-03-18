import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getPullRequestById } from './get-pull-request';
import { v4 as uuid } from 'uuid';

const sqsClient = SQSClientGh.getInstance();
export async function pRReviewCommentOnQueue(
  prReviewComment: Github.ExternalType.Webhook.PRReviewComment,
  pullId: number,
  repoId: number,
  action: string,
  pullRequestData: Github.ExternalType.Webhook.PullRequest
): Promise<void> {
  try {
    /**
     * Search pull request index and check if reviewed_at is null or not. If null then
     * update the value to store the first reviewed_at time. Also this commented shouldn't
     * be by Github Bot. If comment is from Github Bob then we will not update reviewed_at.
     */
    const [pullData] = await getPullRequestById(pullId);
    if (!pullData) {
      logger.error('pRReviewCommentOnQueue.failed: PR NOT FOUND', {
        review: prReviewComment,
        pullId,
        repoId,
        action,
      });
      return;
    }
    await Promise.all([
      sqsClient.sendMessage(
        { comment: prReviewComment, pullId, repoId, action },
        Queue.qGhPrReviewCommentFormat.queueUrl
      ),
      sqsClient.sendMessage(
        {
          ...pullRequestData,
          reviewed_at: pullData.reviewedAt,
          approved_at: pullData.approvedAt,
          review_seconds: pullData.reviewSeconds,
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
