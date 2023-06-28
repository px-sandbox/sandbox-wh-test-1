import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { preparePush } from './push';

export async function getCommits(commits: Github.ExternalType.Webhook.Commit): Promise<void> {
  try {
    await Promise.all([
      commits.commits.map(async (commit: Github.ExternalType.Webhook.Commits): Promise<void> => {
        await new SQSClient().sendMessage(
          {
            commitId: commit.id,
            repository: {
              id: commits.repository.id,
              name: commits.repository.name,
              owner: commits.repository.owner.name,
            },
          },
          Queue.gh_commit_format.queueUrl
        );
      }),
      await preparePush(
        commits.commits,
        commits.ref,
        commits.sender.id,
        commits.after,
        commits.repository.id
      ),
    ]);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
