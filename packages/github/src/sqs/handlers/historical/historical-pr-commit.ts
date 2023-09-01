import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitResp } from '../../../util/octokit-response';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveCommit(commitData: any, messageBody: any): Promise<void> {
  const modifiedCommitData = { ...commitData };
  modifiedCommitData.isMergedCommit = false;
  modifiedCommitData.mergedBranch = null;
  modifiedCommitData.pushedBranch = null;
  await new SQSClient().sendMessage(
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
    Queue.gh_commit_format.queueUrl
  );
}
async function getPRCommits(record: SQSRecord): Promise<boolean | undefined> {
  const messageBody = JSON.parse(record.body);
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
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
      logger.info('HISTORY_MESSGE_BODY', messageBody);
      return;
    }
    const commentsDataOnPr = await octokit(
      `GET /repos/${owner.login}/${name}/pulls/${number}/commits?per_page=100&page=${page}`
    );
    const octokitRespData = getOctokitResp(commentsDataOnPr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.all(octokitRespData.map((commit: any) => saveCommit(commit, messageBody)));

    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR_COMMITS');
      return true;
    }
    messageBody.page = page + 1;
    logger.error(`message-body: ${JSON.stringify(messageBody)}`);
    await getPRCommits({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error(`historical.PR.commits.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.gh_historical_pr_commits.queueUrl, error as Error);
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

      logger.info(`
      PR with no repo: ${body}
      `);

      return false;
    }).map(async (record) => getPRCommits(record))
  );
};
