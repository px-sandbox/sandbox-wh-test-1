import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { ghRequest } from './request-defaults';

export async function pRReviewOnQueue(
  prReview: Array<Github.ExternalType.Webhook.PRReview>,
  pullId: number,
  repoId: number,
  repo: string,
  owner: string,
  pullNumber: number,
  action: string
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
        { review: prReview, pullId: pullId, repoId: repoId, action: action },
        Queue.gh_pr_review_format.queueUrl
      ),
      new SQSClient().sendMessage(
        { ...responseData.data, action: Github.Enums.Comments.REVIEW_COMMENTED },
        Queue.gh_pr_format.queueUrl
      ),
    ]);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
