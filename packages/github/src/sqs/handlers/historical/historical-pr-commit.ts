import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { v4 as uuid } from 'uuid';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';
import { logProcessToRetry } from '../../../util/retry-process';
import { Other } from 'abstraction';

const sqsClient = SQSClient.getInstance();
const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveCommit(
  commitData: any,
  messageBody: any,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const modifiedCommitData = { ...commitData };
  modifiedCommitData.isMergedCommit = false;
  modifiedCommitData.mergedBranch = null;
  modifiedCommitData.pushedBranch = null;
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
    const commentsDataOnPr = (await octokitRequestWithTimeout(
      `GET /repos/${owner.login}/${name}/pulls/${number}/commits?per_page=100&page=${page}`
    )) as OctokitResponse<any>;
    const octokitRespData = getOctokitResp(commentsDataOnPr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.all(
      octokitRespData.map((commit: any) =>
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
