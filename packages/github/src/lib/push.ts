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
  reqCntx: Other.Type.RequestCtx
): Promise<void> {
  try {
    await sqsClient.sendMessage(
      { commits, ref, pusherId, id: lastCommitId, repoId },
      Queue.qGhPushFormat.queueUrl,
      { ...reqCntx }
    );
  } catch (error: unknown) {
    logger.error({ message: 'preparePush.error', error, ...reqCntx });
    throw error;
  }
}
