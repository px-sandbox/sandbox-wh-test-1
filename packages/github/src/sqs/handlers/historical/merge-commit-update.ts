/* eslint-disable max-lines-per-function */
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { logProcessToRetry } from 'rp';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
    verification: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
  url: string;
  html_url: string;
  comments_url: string;
  author: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  } | null;
  committer: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  } | null;
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
}

export const handler = async function updateMergeCommitDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          message: 'UPDATE_MERGE_COMMIT_SQS_RECEIVER',
          data: messageBody,
          requestId,
          resourceId,
        });
        const {
          githubCommitId,
          mergedBranch,
          pushedBranch,
          repoId,
          repoName,
          repoOwner,
          createdAt,
        } = messageBody;
        let { isMergedCommit } = messageBody;
        const installationAccessToken = await getInstallationAccessToken(repoOwner);
        const octokit = ghRequest.request.defaults({
          headers: {
            Authorization: `Bearer ${installationAccessToken.body.token}`,
          },
        });
        const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
        const responseData = (await octokitRequestWithTimeout(
          `GET /repos/${repoOwner}/${repoName}/commits/${githubCommitId}`
        )) as OctokitResponse<GitHubCommit>;

        const parentCommit = responseData.data.parents.length >= 2;
        if (parentCommit) {
          logger.info({
            message: 'parent_commit_found_for_commit_id',
            data: githubCommitId,
            requestId,
            resourceId,
          });
          isMergedCommit = true;
          const commitProcessor = new CommitProcessor(
            {
              ...getOctokitResp(responseData),
              commits: {
                id: githubCommitId,
                isMergedCommit,
                mergedBranch,
                pushedBranch,
                timestamp: createdAt,
                committer: {
                  username: responseData.data.commit.committer.name,
                  email: responseData.data.commit.committer.email,
                },
                message: responseData.data.commit.message,
                orgId: repoId.replace(/gh_repo_/g, ''),
              },
              repoId: repoId.replace(/gh_repo_/g, ''),
              timestamp: responseData.data.commit.committer.date,
              stats: {
                total: '0',
              },
              files: [
                {
                  filename: '',
                  additions: '0',
                  deletions: '0',
                  changes: '0',
                  status: 'modified',
                },
              ],
              author: responseData.data.author
                ? {
                    login: responseData.data.author.login,
                    id: String(responseData.data.author.id),
                  }
                : {
                    login: '',
                    id: '',
                  },
              commit: {
                message: responseData.data.commit.message,
                committer: {
                  id: responseData.data.committer?.id || 0,
                  login: responseData.data.commit.committer.name,
                  date: responseData.data.commit.committer.date,
                },
              },
              committer: responseData.data.committer
                ? {
                    id: String(responseData.data.committer.id),
                  }
                : {
                    id: '',
                  },
            },
            requestId,
            resourceId
          );
          await commitProcessor.process();
          await commitProcessor.save();
        }
      } catch (error) {
        logger.error({
          message: 'updateMergeCommitFormattedDataReceiver',
          error,
          requestId,
          resourceId,
        });
        await logProcessToRetry(record, Queue.qUpdateMergeCommit.queueUrl, error as Error);
      }
    })
  );
};
