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
  ref: string,
  id: string
): Promise<any> {
  try {
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const responseData = await octokit(`GET /repos/${owner}/${repo}/commits/${ref}`);
    await new SQSClient().sendMessage(
      { ...responseData.data, id },
      Queue.gh_commit_format.queueUrl
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
