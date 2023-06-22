import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';
import { preparePush } from './push';
import { ghRequest } from './request-defaults';

export async function getCommits(commits: Github.ExternalType.Webhook.Commit): Promise<void> {
  try {
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    await Promise.all(
      commits.commits.map(async (commit: Github.ExternalType.Webhook.Commits): Promise<void> => {
        const responseData = await octokit(
          `GET /repos/${commits.repository.owner.name}/${commits.repository.name}/commits/${commit.id}`
        );
        await new SQSClient().sendMessage(
          {
            ...responseData.data,
            commits: { id: commit.id },
            repoId: commits.repository.id,
          },
          Queue.gh_commit_format.queueUrl
        );
      })
    );
    await preparePush(
      commits.commits,
      commits.ref,
      commits.sender.id,
      commits.after,
      commits.repository.id
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
