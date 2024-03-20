import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { preparePush } from './push';
import { v4 as uuid } from 'uuid';

const sqsClient = SQSClientGh.getInstance();

export async function getCommits(commits: Github.ExternalType.Webhook.Commit): Promise<void> {
  try {
    if (commits.commits.length > 0) {
      await Promise.all([
        ...commits.commits.map(async (commit: Github.ExternalType.Webhook.Commits): Promise<void> => {
          return sqsClient.sendFifoMessage(
            {
              commitId: commit.id,
              isMergedCommit: false, //by default setting a commit to merge false
              mergedBranch: null,
              pushedBranch: commits.ref.split('/heads/').slice(-1)[0],
              repository: {
                id: commits.repository.id,
                name: commits.repository.name,
                owner: commits.repository.owner.name,
              },
              timestamp: commit.timestamp,
            },
            Queue.qGhCommitFormat.queueUrl,
            commit.id,
            uuid()
          );
        }),
        preparePush(
          commits.commits,
          commits.ref,
          commits.sender.id,
          commits.after,
          commits.repository.id
        ),
      ]);
    }
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
