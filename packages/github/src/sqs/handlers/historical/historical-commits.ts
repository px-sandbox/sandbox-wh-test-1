import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getOctokitResp } from 'src/util/octokit-response';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  logger.info(`total event records: ${event.Records.length}`);
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);
      if (body.owner && body.name && body.branchName) {
        return true;
      }

      logger.info(`
      COMMIT_MESSAGE_BODY: ${body}
      `);

      return false;
    }).map(async (record: any) => {
      await getRepoCommits(record);
    })
  );
};
async function getRepoCommits(record: any) {
  let messageBody = JSON.parse(record.body);
  const { owner, name, page = 1, githubRepoId, branchName } = messageBody;
  logger.info(`page: ${page}`);
  try {
    const commitDataOnPr = await octokit(
      `GET /repos/${owner}/${name}/commits?sha=${branchName}&per_page=100&page=${page}`
    );
    const octokitRespData = getOctokitResp(commitDataOnPr);
    let queueProcessed = [];
    queueProcessed = octokitRespData.map((commitData: any) =>
      new SQSClient().sendMessage(
        {
          commitId: commitData.sha,
          isMergedCommit: false,
          mergedBranch: null,
          pushedBranch: null,
          repository: {
            id: githubRepoId,
            name: name,
            owner: owner,
          },
          timestamp: new Date(),
        },
        Queue.gh_commit_format.queueUrl,
        commitData.sha
      )
    );
    await Promise.all(queueProcessed);

    logger.info(`ALL_AWAITED_COMMIT_QUEUE_PROCESSED: ${queueProcessed.length}`);

    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      messageBody.page = page + 1;
      logger.info(`message_body_pr_commits: ${JSON.stringify(messageBody)}`);
      await getRepoCommits({ body: JSON.stringify(messageBody) });
    }
  } catch (error) {
    logger.error(JSON.stringify({ message: 'historical.commits.error', error }));
    await logProcessToRetry(record, Queue.gh_historical_commits.queueUrl, error);
  }
}
