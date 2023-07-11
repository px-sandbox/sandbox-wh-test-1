import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function pROnQueue(
  pull: Github.ExternalType.Webhook.PullRequest,
  action: string,
  attempt: number = 1
): Promise<void> {
  try {
    await new SQSClient().sendMessage(
      { ...pull, reviewed_at: null, approved_at: null, action: action, attempt: attempt },
      Queue.gh_pr_format.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
