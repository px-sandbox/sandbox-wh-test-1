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

export const handler = async function collectPRData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  logger.info( `total event records: ${event.Records.length}`);
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);

      if (body.owner && body.name) {
        return true;
      }

      logger.info(`
      PR_MESSAGE_BODY: ${JSON.stringify(body)}
      `);

      return false;
    }).map(async (record: any) => await getPrList(record, octokit))
  );
};
async function getPrList(
  record: any,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const messageBody = JSON.parse(record.body);
  logger.info(JSON.stringify(messageBody));
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
    return;
  }
  const { page = 1, owner, name } = messageBody;
  logger.info(`page: ${page}`);
  try {
    // const last_one_year_date = moment().subtract(1, 'year').toISOString();
    const responseData = await octokit(
      `GET /repos/${owner}/${name}/pulls?state=all&per_page=50&page=${page}&sort=created&direction=desc`
    );
    logger.info(`total prs from GH: ${responseData.data.length}`);
    logger.info(`GH url: /repos/${owner}/${name}/pulls?state=all&per_page=50&page=${page}&sort=created&direction=desc`)

    const octokitRespData = getOctokitResp(responseData);
    if (octokitRespData.length === 0) {
      logger.info('HISTORY_EMPTY_PULLS', responseData);
      return;
    }
    // const prs = responseData.data.filter((pr: any) =>
    //   moment(pr.created_at).isSameOrAfter(last_one_year_date)
    // );
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
    logger.info(`total prs: ${octokitRespData.length}`)
    if (octokitRespData.length < 50) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      messageBody.page = page + 1;
      logger.info(`messageBody: ${JSON.stringify(messageBody)}`);
      await new SQSClient().sendMessage(messageBody, Queue.gh_historical_pr.queueUrl);
    }
  } catch (error) {
    logger.error('historical.PR.error', { error });
    await logProcessToRetry(record, Queue.gh_historical_pr.queueUrl, error);
  }
}
