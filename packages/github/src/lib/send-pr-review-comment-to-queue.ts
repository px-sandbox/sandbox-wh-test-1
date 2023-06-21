import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function pullRequestReviewCommentOnQueue(
  prReviewComment: Array<Github.ExternalType.Webhook.PullRequestReviewComment>,
  pullId: number,
  repoId: number
): Promise<void> {
  try {
    await new SQSClient().sendMessage(
      { comment: prReviewComment, pullId: pullId, repoId: repoId },
      Queue.gh_pr_review_comment_format.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
