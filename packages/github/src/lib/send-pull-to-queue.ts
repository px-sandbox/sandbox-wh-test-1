import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function pullRequestOnQueue(
  pull: Array<Github.ExternalType.Webhook.PullRequest>
): Promise<void> {
  try {
    await new SQSClient().sendMessage(pull, Queue.gh_pull_request_format.queueUrl);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
