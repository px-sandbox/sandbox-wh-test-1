import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPRCommitData(event: SQSEvent): Promise<any> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });

  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);
      if (body.head && body.head.repo) {
        return true;
      }

      logger.info(`
      PR with no repo: ${body}
      `);

      return false;
    }).map(async (record: any) => {
      await getPRCommits(record, octokit);
    })
  );
};
async function getPRCommits(
  record: any,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const messageBody = JSON.parse(record.body);
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
    return;
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
      logger.info('HISTORY_MESSGE_BODY', messageBody);
      return;
    }
    const commentsDataOnPr = await octokit(
      `GET /repos/${owner.login}/${name}/pulls/${number}/commits?per_page=100&page=${page}`
    );

    await Promise.all(commentsDataOnPr.data.map((commit: any) => saveCommit(commit, messageBody)));

    if (commentsDataOnPr.data.length < 100) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return;
    } else {
      messageBody.page = page + 1;
      await new SQSClient().sendMessage(messageBody, Queue.gh_historical_commits.queueUrl);
    }
  } catch (error) {
    logger.error('historical.PR.commits.error', { error });
    await logProcessToRetry(record, Queue.gh_historical_pr_commits.queueUrl, error);
  }
}

async function saveCommit(commitData: any, messageBody: any) {
  commitData.isMergedCommit = false;
  commitData.mergedBranch = null;
  commitData.pushedBranch = null;
  await new SQSClient().sendMessage(
    {
      commitId: commitData.sha,
      isMergedCommit: commitData.isMergedCommit,
      mergedBranch: commitData.mergedBranch,
      pushedBranch: commitData.pushedBranch,
      repository: {
        id: messageBody.head.repo.owner.id,
        name: messageBody.head.repo.name,
        owner: messageBody.head.repo.owner.login,
      },
      timestamp: new Date(),
    },
    Queue.gh_commit_format.queueUrl
  );
}
