import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function pullRequestOnQueue(
  pull: Array<Github.ExternalType.Webhook.PullRequest>,
  action: string
): Promise<void> {
  try {
    await new SQSClient().sendMessage({ ...pull, action }, Queue.gh_pull_request_format.queueUrl);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
