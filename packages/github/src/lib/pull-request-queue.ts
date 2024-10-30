/* eslint-disable max-lines-per-function */
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';

const sqsClient = SQSClient.getInstance();
export async function pROnQueue(
  pull: Github.ExternalType.Webhook.PullRequest,
  action: Github.Enums.PullRequest,
  requestId: string
): Promise<void> {
  try {
    const pullRequestEvents = [
      Github.Enums.PullRequest.ReviewRequested,
      Github.Enums.PullRequest.ReviewRequestRemoved,
      Github.Enums.PullRequest.Edited,
      Github.Enums.PullRequest.Reopened,
      Github.Enums.PullRequest.Assigned,
      Github.Enums.PullRequest.Unassigned,
      Github.Enums.PullRequest.Labeled,
      Github.Enums.PullRequest.Unlabeled,
      Github.Enums.PullRequest.ReadyForReview,
      Github.Enums.PullRequest.ConvertedToDraft,
      Github.Enums.PullRequest.Closed,
      Github.Enums.PullRequest.Opened,
    ];

    if (pullRequestEvents.includes(action)) {
      await sqsClient.sendFifoMessage(
        {
          ...pull,
          action,
        },
        Queue.qGhPrFormat.queueUrl,
        { requestId, resourceId: String(pull.id) },
        String(pull.id),
        uuid()
      );
    }
  } catch (error: unknown) {
    logger.error({
      message: 'pROnQueue.Error in pROnQueue',
      requestId,
      resourceId: String(pull.id),
      error,
    });
    throw error;
  }
}
