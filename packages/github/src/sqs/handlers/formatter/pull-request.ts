import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import async from 'async';
import { Github } from 'abstraction';
import _ from 'lodash';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { processPRComments } from '../../../util/process-pr-comments';
import { PRProcessor } from '../../../processors/pull-request';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('PULL_SQS_RECEIVER_HANDLER', { messageBody });
    const pullProcessor = new PRProcessor(messageBody);
    const data = await pullProcessor.processor();
    const reviewCommentCount = await processPRComments(
      messageBody.head.repo.owner.login,
      messageBody.head.repo.name,
      messageBody.number,
      octokitRequestWithTimeout
    );
    data.body.reviewComments = reviewCommentCount;
    await pullProcessor.save({ data, eventType: Github.Enums.Event.PullRequest });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrFormat.queueUrl, error as Error);
    logger.error(`pRFormattedDataReceiver.error, ${error}`);
  }
}
export const handler = async function pRFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(async (group) => {
      return new Promise((resolve) => {
        async.eachSeries(
          group,
          async function (item) {
            await processAndStoreSQSRecord(item);
          },
          (error) => {
            if (error) {
              logger.error(`pRFormattedDataReceiver.error, ${error}`);
            }
            resolve('Done');
          }
        );
      });
    })
  );
};
