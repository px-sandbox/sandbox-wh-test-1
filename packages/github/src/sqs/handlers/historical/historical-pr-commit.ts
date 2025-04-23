import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { v4 as uuid } from 'uuid';
import { logProcessToRetry } from 'rp';
import { Other } from 'abstraction';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

interface GitHubPullRequestCommit {
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

interface PullRequestMessageBody {
  page?: number;
  number: number;
  head: {
    repo: {
      owner: {
        login: string;
        id: number;
      };
      name: string;
    };
  };
}

interface ExtendedGitHubPullRequestCommit extends GitHubPullRequestCommit {
  isMergedCommit: boolean;
  mergedBranch: string | null;
  pushedBranch: string | null;
}

const sqsClient = SQSClient.getInstance();

async function saveCommit(
  commitData: GitHubPullRequestCommit,
  messageBody: PullRequestMessageBody,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const modifiedCommitData: ExtendedGitHubPullRequestCommit = {
    ...commitData,
    isMergedCommit: false,
    mergedBranch: null,
    pushedBranch: null,
  };
  await sqsClient.sendFifoMessage(
    {
      commitId: modifiedCommitData.sha,
      isMergedCommit: modifiedCommitData.isMergedCommit,
      mergedBranch: modifiedCommitData.mergedBranch,
      pushedBranch: modifiedCommitData.pushedBranch,
      repository: {
        id: messageBody.head.repo.owner.id,
        name: messageBody.head.repo.name,
        owner: messageBody.head.repo.owner.login,
      },
      timestamp: new Date(),
    },
    Queue.qGhCommitFormat.queueUrl,
    { ...reqCtx },
    modifiedCommitData.sha,
    uuid()
  );
}

async function getPRCommits(record: SQSRecord): Promise<boolean | undefined> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  if (!messageBody && !messageBody.head) {
    logger.info({
      message: 'HISTORY_MESSAGE_BODY_EMPTY',
      data: messageBody,
      requestId,
      resourceId,
    });
    return false;
  }
  const {
    page = 1,
    number,
    head: {
      repo: { owner, name },
    },
  } = messageBody;
  try {
    if (!messageBody && !messageBody.head) {
      logger.info({ message: 'HISTORY_MESSAGE_BODY', data: messageBody, requestId, resourceId });
      return;
    }
    const installationAccessToken = await getInstallationAccessToken(owner);
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
    const commentsDataOnPr = (await octokitRequestWithTimeout(
      `GET /repos/${owner.login}/${name}/pulls/${number}/commits?per_page=100&page=${page}`
    )) as OctokitResponse<GitHubPullRequestCommit[]>;
    const octokitRespData = getOctokitResp(commentsDataOnPr);
    await Promise.all(
      octokitRespData.map((commit: GitHubPullRequestCommit) =>
        saveCommit(commit, messageBody, { requestId, resourceId })
      )
    );

    if (octokitRespData.length < 100) {
      logger.info({ message: 'LAST_100_RECORD_PR_COMMITS', requestId, resourceId });
      return true;
    }
    messageBody.page = page + 1;
    logger.error({ message: `message-body: ${JSON.stringify(messageBody)}` });
    await getPRCommits({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error({
      message: 'historical.PR.commits.error',
      error: JSON.stringify(error),
      requestId,
      resourceId,
    });
    await logProcessToRetry(record, Queue.qGhHistoricalPrCommits.queueUrl, error as Error);
  }
}

export const handler = async function collectPRCommitData(
  event: SQSEvent
): Promise<void | boolean> {
  await Promise.all(
    event.Records.filter((record) => {
      const body = JSON.parse(record.body);
      if (body.head?.repo) {
        return true;
      }

      logger.info({
        message: 'PR with no repo:',
        data: JSON.stringify(body),
      });

      return false;
    }).map(async (record) => getPRCommits(record))
  );
};
