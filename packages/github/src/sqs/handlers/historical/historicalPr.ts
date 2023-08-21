import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { get } from 'http';
import moment from 'moment';
import { ghRequest } from 'src/lib/requestDefaults';
import { getInstallationAccessToken } from 'src/util/installationAccessTokenGenerator';
import { getOctokitResp } from 'src/util/octokit-response';
import { logProcessToRetry } from 'src/util/retryProcess';
import { Queue } from 'sst/node/queue';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});

export const handler = async function collectPRData(event: SQSEvent): Promise<void> {
  logger.info(`total event records: ${event.Records.length}`);
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);

      if (body.owner && body.name) {
        return true;
      }
      return false;
    }).map(async (record: any) => await getPrList(record))
  );
};

async function getPrList(record: any) {
  let messageBody = JSON.parse(record.body);
  logger.info(JSON.stringify(messageBody));
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
    return;
  }
  let { page = 1 } = messageBody;
  const { owner, name } = messageBody;
  logger.info(`page: ${page}`);
  try {
    // const last_one_year_date = moment().subtract(1, 'year').toISOString();
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
      ...octokitRespData.map((prData: any) =>
        new SQSClient().sendMessage(prData, Queue.gh_historical_reviews.queueUrl)
      ),
      ...octokitRespData.map((prData: any) =>
        new SQSClient().sendMessage(prData, Queue.gh_historical_pr_comments.queueUrl)
      ),
    ];
    await Promise.all(processes);
    logger.info(`total comments processed: ${processes.length}`);
    logger.info(`total prs: ${octokitRespData.length}`);
    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      messageBody.page = page + 1;
      logger.info(`messageBody: ${JSON.stringify(messageBody)}`);
      await getPrList({ body: JSON.stringify(messageBody) });
    }
  } catch (error) {
    logger.error(`historical.PR.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.gh_historical_pr.queueUrl, error);
  }
}
