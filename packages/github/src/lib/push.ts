import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';

const sqsClient = SQSClient.getInstance();

export async function preparePush(
  commits: Array<Github.ExternalType.Webhook.Commits>,
  ref: string,
  pusherId: string,
  lastCommitId: string,
  repoId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    await sqsClient.sendMessage(
      { commits, ref, pusherId, id: lastCommitId, repoId },
      Queue.qGhPushFormat.queueUrl,
      { ...reqCtx }
    );
  } catch (error: unknown) {
    logger.error({ message: 'preparePush.error', error, ...reqCtx });
    throw error;
  }
}
