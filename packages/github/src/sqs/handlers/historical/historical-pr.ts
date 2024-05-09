import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from 'rp';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
const sqsClient = SQSClient.getInstance();

async function getPrList(record: SQSRecord): Promise<boolean | undefined> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  logger.info({
    message: 'historical.prlist',
    data: JSON.stringify(messageBody),
    requestId,
    resourceId,
  });
  if (!messageBody && !messageBody.head) {
    logger.info({
      message: 'HISTORY_MESSAGE_BODY_EMPTY',
      data: messageBody,
      requestId,
      resourceId,
    });
    return false;
  }
  const { page = 1 } = messageBody;
  const { owner, name } = messageBody;
  try {
    const responseData = (await octokitRequestWithTimeout(
      `GET /repos/${owner}/${name}/pulls?state=all&per_page=100&page=${page}&sort=created&direction=desc`
    )) as OctokitResponse<any>;
    logger.info({
      message: `total prs from GH: ${responseData.data.length}`,
      requestId,
      resourceId,
    });

    const octokitRespData = getOctokitResp(responseData);
    if (octokitRespData.length === 0) {
      logger.info({ message: 'HISTORY_EMPTY_PULLS', data: responseData, requestId, resourceId });
      return;
    }

    let processes = [];
    processes = [
      ...octokitRespData.map((prData: unknown) =>
        sqsClient.sendMessage(prData, Queue.qGhHistoricalReviews.queueUrl, {
          requestId,
          resourceId,
        })
      ),
      ...octokitRespData.map((prData: unknown) =>
        sqsClient.sendMessage(prData, Queue.qGhHistoricalPrComments.queueUrl, {
          requestId,
          resourceId,
        })
      ),
    ];
    await Promise.all(processes);
    logger.info({
      message: `total comments processed: ${processes.length}`,
      requestId,
      resourceId,
    });
    logger.info({ message: `total prs: ${octokitRespData.length}`, requestId, resourceId });
    if (octokitRespData.length < 100) {
      logger.info({ message: 'LAST_100_RECORD_PR', requestId, resourceId });
      return true;
    }
    messageBody.page = page + 1;
    logger.info({
      message: 'prlist.messageBody',
      data: JSON.stringify(messageBody),
      requestId,
      resourceId,
    });
    await getPrList({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error({
      message: 'historical.PR.error',
      data: JSON.stringify(error),
      requestId,
      resourceId,
    });
    await logProcessToRetry(record, Queue.qGhHistoricalPr.queueUrl, error as Error);
  }
}

export const handler = async function collectPRData(event: SQSEvent): Promise<undefined> {
  logger.info({ message: `total event records: ${event.Records.length}` });
  await Promise.all(
    event.Records.filter((record) => {
      const body = JSON.parse(record.body);

      if (body.owner && body.name) {
        return true;
      }
      return false;
    }).map(async (record) => getPrList(record))
  );
};
