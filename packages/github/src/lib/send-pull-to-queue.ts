import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function pROnQueue(
  pull: Array<Github.ExternalType.Webhook.PullRequest>,
  action: string
): Promise<void> {
  try {
    await new SQSClient().sendMessage({ ...pull, action }, Queue.gh_pr_format.queueUrl);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
