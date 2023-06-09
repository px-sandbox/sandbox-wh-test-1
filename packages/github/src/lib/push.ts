import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function preparePush(
  commits: Array<Github.ExternalType.Webhook.Commits>,
  ref: string,
  pusherId: string,
  lastCommitId: string
): Promise<void> {
  try {
    await new SQSClient().sendMessage(
      { commits, ref, pusherId, id: lastCommitId },
      Queue.gh_push_format.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
