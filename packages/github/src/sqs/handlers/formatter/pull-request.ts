import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import async from 'async';
import { Github } from 'abstraction';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { processPRComments } from '../../../util/process-pr-comments';
import { PRProcessor } from '../../../processors/pull-request';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    const installationAccessToken = await getInstallationAccessToken(
      messageBody.head.repo.owner.login
    );
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
    logger.info({ message: 'PULL_SQS_RECEIVER_HANDLER', data: messageBody, requestId, resourceId });
    const pullProcessor = new PRProcessor(messageBody, requestId, resourceId);
    const data = await pullProcessor.processor();
    const reviewCommentCount = await processPRComments(
      messageBody.head.repo.owner.login,
      messageBody.head.repo.name,
      messageBody.number,
      octokitRequestWithTimeout
    );
    data.body.reviewComments = reviewCommentCount;
    await pullProcessor.save({
      data,
      eventType: Github.Enums.Event.PullRequest,
      processId: messageBody?.processId,
    });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrFormat.queueUrl, error as Error);
    logger.error({ message: 'pRFormattedDataReceiver.error', error, requestId, resourceId });
  }
}
export const handler = async function pRFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (item) => {
              await processAndStoreSQSRecord(item);
            },
            (error) => {
              if (error) {
                logger.error({ message: 'pRFormattedDataReceiver.error', error });
              }
              resolve('Done');
            }
          );
        })
    )
  );
};
