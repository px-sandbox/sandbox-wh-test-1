import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';
import { ghRequest } from './request-defaults';

export async function getCommits(
  repo: string,
  owner: string,
  commits: Array<Github.ExternalType.Webhook.Commits>
): Promise<void> {
  try {
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });

    commits.map(async (commit: Github.ExternalType.Webhook.Commits): Promise<void> => {
      const responseData = await octokit(`GET /repos/${owner}/${repo}/commits/${commit.id}`);
      new SQSClient().sendMessage(
        { ...responseData.data, commits: { id: commit.id } },
        Queue.gh_commit_format.queueUrl
      );
    });
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
