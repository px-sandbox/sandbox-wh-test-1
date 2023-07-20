import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { PullRequest } from 'abstraction/github/enums';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function pROnQueue(
  pull: Github.ExternalType.Webhook.PullRequest,
  action: string
): Promise<void> {
  try {
    await new SQSClient().sendMessage(
      { ...pull, reviewed_at: null, approved_at: null, action: action },
      Queue.gh_pr_format.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
