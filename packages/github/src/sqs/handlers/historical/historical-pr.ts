import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from '../../../util/retry-process';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});

async function getPrList(record: SQSRecord): Promise<boolean | undefined> {
  const messageBody = JSON.parse(record.body);
  logger.info(JSON.stringify(messageBody));
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
    return false;
  }
  const { page = 1 } = messageBody;
  const { owner, name } = messageBody;
  logger.info(`page: ${page}`);
  try {
    const responseData = await octokit(
      `GET /repos/${owner}/${name}/pulls?state=all&per_page=100&page=${page}&sort=created&direction=desc`
    );
    logger.info(`total prs from GH: ${responseData.data.length}`);
    logger.info(
      `GH url: /repos/${owner}/${name}/pulls?state=all&per_page=50&page=${page}&sort=created&direction=desc`
    );

    const octokitRespData = getOctokitResp(responseData);
    if (octokitRespData.length === 0) {
      logger.info('HISTORY_EMPTY_PULLS', responseData);
      return;
    }

    let processes = [];
    processes = [
      ...octokitRespData.map((prData: unknown) =>
        new SQSClient().sendMessage(prData, Queue.qGhHistoricalReviews.queueUrl)
      ),
      ...octokitRespData.map((prData: unknown) =>
        new SQSClient().sendMessage(prData, Queue.qGhHistoricalPrComments.queueUrl)
      ),
    ];
    await Promise.all(processes);
    logger.info(`total comments processed: ${processes.length}`);
    logger.info(`total prs: ${octokitRespData.length}`);
    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return true;
    }
    messageBody.page = page + 1;
    logger.info(`messageBody: ${JSON.stringify(messageBody)}`);
    await getPrList({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error(`historical.PR.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.qGhHistoricalPr.queueUrl, error as Error);
  }
}

export const handler = async function collectPRData(event: SQSEvent): Promise<undefined> {
  logger.info(`total event records: ${event.Records.length}`);
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
