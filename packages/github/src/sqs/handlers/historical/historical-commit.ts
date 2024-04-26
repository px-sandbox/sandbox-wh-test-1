import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { v4 as uuid } from 'uuid';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const installationAccessToken = await getInstallationAccessToken();
const sqsClient = SQSClient.getInstance();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
async function getRepoCommits(record: SQSRecord): Promise<boolean | undefined> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  const { owner, name, page = 1, githubRepoId, branchName } = messageBody;
  try {
    const commitDataOnPr = (await octokitRequestWithTimeout(
      `GET /repos/${owner}/${name}/commits?sha=${branchName}&per_page=100&page=${page}`
    )) as OctokitResponse<any>;
    const octokitRespData = getOctokitResp(commitDataOnPr);
    let queueProcessed = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueProcessed = octokitRespData.map((commitData: any) =>
      sqsClient.sendFifoMessage(
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
        { requestId, resourceId },
        commitData.sha,
        uuid()
      )
    );
    await Promise.all(queueProcessed);

    logger.info({
      message: 'ALL_AWAITED_COMMIT_QUEUE_PROCESSED',
      data: queueProcessed.length,
      requestId,
      resourceId,
    });

    if (octokitRespData.length < 100) {
      logger.info({ message: 'LAST_100_RECORD_PR', requestId, resourceId });
      return true;
    }
    messageBody.page = page + 1;
    logger.info({
      message: 'message_body_pr_commits',
      data: JSON.stringify(messageBody),
      requestId,
      resourceId,
    });
    await getRepoCommits({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error({ message: 'historical.commits.error', error, requestId, resourceId });
    await logProcessToRetry(record, Queue.qGhHistoricalCommits.queueUrl, error as Error);
  }
}
export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  logger.info({ message: 'total event records:', data: event.Records.length });
  await Promise.all(
    event.Records.filter((record) => {
      const body = JSON.parse(record.body);
      if (body.owner && body.name && body.branchName) {
        return true;
      }
      logger.info({ message: 'COMMIT_MESSAGE_BODY', data: JSON.stringify(body) });
      return false;
    }).map(async (record) => getRepoCommits(record))
  );
};
