import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { ghRequest } from './request-defaults';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { mappingPrefixes } from 'src/constant/config';
import { searchedDataFormator } from 'src/util/response-formatter';

export async function pRReviewCommentOnQueue(
  prReviewComment: Github.ExternalType.Webhook.PRReviewComment,
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

    //
    let reviewed_at = null;
    let approved_at = null;
    /**
     * Search pull request index and check if reviewed_at and approved_at is null or not. If null then
     * update the value to store the first reviewed_at and approved_at time.
     */
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', `${mappingPrefixes}_${pullId}`).toJSON();
    const pullData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, matchQry);
    const formattedData = await searchedDataFormator(pullData);
    if (formattedData[0] && formattedData[0].reviewed_at === null) {
      if (prReviewComment.user.type !== Github.Enums.UserType.BOT) {
        reviewed_at = prReviewComment.created_at;
      }
    }

    if (formattedData[0] && formattedData[0].approved_at !== null) {
      approved_at = formattedData[0].approved_at;
    }

    await Promise.all([
      new SQSClient().sendMessage(
        { comment: prReviewComment, pullId: pullId, repoId: repoId, action: action },
        Queue.gh_pr_review_comment_format.queueUrl
      ),
      new SQSClient().sendMessage(
        {
          ...responseData.data,
          reviewed_at: reviewed_at,
          approved_at: approved_at,
          action: Github.Enums.Comments.PR_COMMENTED,
          attempt: 1,
        },
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
