import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPRData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  // for (const record of event.Records) {
  let page = 1;
  const perPage = 100;
  const record = event.Records;
  const messageBody = JSON.parse(record[0].body);
  logger.info('ALL_COMMIT_HISTORY_FOR_A_REPO', { messageBody });
  await getPrList(messageBody.owner, messageBody.name, perPage, page, octokit);
};
async function getPrList(
  owner: string,
  name: string,
  perPage: number,
  page: number,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const responseData = await octokit(
    `GET /repos/${owner}/history/pulls?state=all&per_page=${perPage}&page=${page}`
  );

  responseData.data.map(async (prData: any) => {
    await new SQSClient().sendMessage(prData, Queue.gh_historical_reviews.queueUrl);
  });
  if (responseData.data.length < perPage) {
    logger.info('LAST_100_RECORD_PR');
    return;
  } else {
    page++;
    await getPrList(owner, name, perPage, page, octokit);
  }
}
