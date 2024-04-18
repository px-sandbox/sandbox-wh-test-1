import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();

export async function preparePush(
  commits: Array<Github.ExternalType.Webhook.Commits>,
  ref: string,
  pusherId: string,
  lastCommitId: string,
  repoId: string,
  orgId: string
): Promise<void> {
  try {
    await sqsClient.sendMessage(
      { commits, ref, pusherId, id: lastCommitId, repoId, orgId },
      Queue.qGhPushFormat.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
