import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { ghRequest } from './request-defaults';

export async function pullRequestReviewOnQueue(
  prReview: Array<Github.ExternalType.Webhook.PullRequestReview>,
  pullId: number,
  repoId: number,
  repo: string,
  owner: string,
  pullNumber: number
): Promise<void> {
  try {
    //Get token to pass into header of Github Api call
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });

    //Get pull request details through Github Api and update the same into index.
    const responseData = await octokit(`GET /repos/${owner}/${repo}/pulls/${pullNumber}`);
    await Promise.all([
      new SQSClient().sendMessage(
        { review: prReview, pullId: pullId, repoId: repoId },
        Queue.gh_pull_request_review_format.queueUrl
      ),
      new SQSClient().sendMessage(responseData.data, Queue.gh_pull_request_format.queueUrl),
    ]);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
