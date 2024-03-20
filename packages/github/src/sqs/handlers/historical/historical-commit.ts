import { SQSClientGh } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const installationAccessToken = await getInstallationAccessToken();
const sqsClient = SQSClientGh.getInstance();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
async function getRepoCommits(record: SQSRecord): Promise<boolean | undefined> {
  const messageBody = JSON.parse(record.body);
  const { owner, name, page = 1, githubRepoId, branchName } = messageBody;
  logger.info(`page: ${page}`);
  try {
    const commitDataOnPr = (await octokitRequestWithTimeout(
      `GET /repos/${owner}/${name}/commits?sha=${branchName}&per_page=100&page=${page}`
    )) as OctokitResponse<any>;
    const octokitRespData = getOctokitResp(commitDataOnPr);
    let queueProcessed = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueProcessed = octokitRespData.map((commitData: any) =>
      sqsClient.sendMessage(
        {
          commitId: commitData.sha,
          isMergedCommit: false,
          mergedBranch: null,
          pushedBranch: null,
          repository: {
            id: githubRepoId,
            name,
            owner,
          },
          timestamp: new Date(),
        },
        Queue.qGhCommitFormat.queueUrl,
        commitData.sha
      )
    );
    await Promise.all(queueProcessed);

    logger.info(`ALL_AWAITED_COMMIT_QUEUE_PROCESSED: ${queueProcessed.length}`);

    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return true;
    }
    messageBody.page = page + 1;
    logger.info(`message_body_pr_commits: ${JSON.stringify(messageBody)}`);
    await getRepoCommits({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error(JSON.stringify({ message: 'historical.commits.error', error }));
    await logProcessToRetry(record, Queue.qGhHistoricalCommits.queueUrl, error as Error);
  }
}
export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  logger.info(`total event records: ${event.Records.length}`);
  await Promise.all(
    event.Records.filter((record) => {
      const body = JSON.parse(record.body);
      if (body.owner && body.name && body.branchName) {
        return true;
      }

      logger.info(`
      COMMIT_MESSAGE_BODY: ${body}
      `);

      return false;
    }).map(async (record) => getRepoCommits(record))
  );
};
