import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

export async function preparePush(
  commits: Array<Github.ExternalType.Webhook.Commits>,
  ref: string,
  pusherId: string,
  lastCommitId: string,
  repoId: string
): Promise<void> {
  try {
    await new SQSClient().sendMessage(
      { commits, ref, pusherId, id: lastCommitId, repoId },
      Queue.qGhPushFormat.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
