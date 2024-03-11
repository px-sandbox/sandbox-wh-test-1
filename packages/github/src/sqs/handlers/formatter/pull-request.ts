import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-default';
import { getInstallationAccessToken } from 'src/util/installation-access-token';
import { processPRComments } from 'src/util/process-pr-comments';
import { Queue } from 'sst/node/queue';
import { PRProcessor } from '../../../processors/pull-request';
import { logProcessToRetry } from '../../../util/retry-process';
import async from 'async';
import { Github } from 'abstraction';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});

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
      octokit
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
  await await async.eachSeries(event.Records, processAndStoreSQSRecord, (error) => {
    if (error) {
      logger.error(`pRFormattedDataReceiver.error, ${error}`);
    }
  });
};
