import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Github } from 'abstraction';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { RetryTableMapping } from '../model/retry-table-mapping';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';

const dynamodbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function processIt(record: Github.Type.QueueMessage): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId } = record;
  logger.info('RetryProcessHandlerProcessData', { processId, messageBody, queue });
  try {
    // send to queue
    await sqsClient
      .sendMessage(JSON.parse(messageBody), queue, MessageDeduplicationId)
      .then(async () => {
        logger.info('RetryProcessHandlerProcess.success', { processId, queue });
        await dynamodbClient.delete(new RetryTableMapping().prepareDeleteParams(processId));
        logger.info('RetryProcessHandlerProcess.delete', { processId, queue });
      })
      .catch((error) => {
        logger.error('RetryProcessHandlerProcess.error', error);
      });
  } catch (error) {
    logger.error('RetryProcessHandlerProcess.error', error);
  }
}

export async function handler(): Promise<void> {
  logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });

  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

  const githubRetryLimit = await octokitRequestWithTimeout('GET /rate_limit');
  if (githubRetryLimit.data && githubRetryLimit.data.rate.remaining > 3) {
    const itemsToPick = githubRetryLimit.data.rate.remaining / 3;
    const limit = 200;
    const params = new RetryTableMapping().prepareScanParams(limit);

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < Math.floor(itemsToPick / limit); i++) {
      logger.info(`RetryProcessHandler process count ${i} at: ${new Date().toISOString()}`);
      // eslint-disable-next-line no-await-in-loop
      const processes = await dynamodbClient.scanAllItems(params);
      if (processes.Count === 0) {
        logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
        return;
      }
      const items = processes.Items ? (processes.Items as Github.Type.QueueMessage[]) : [];
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        items.map((record: unknown) => processIt(record as Github.Type.QueueMessage))
      );
      logger.info('RetryProcessHandler lastEvaluatedKey', {
        lastEvaluatedKey: processes.LastEvaluatedKey,
      });
      params.ExclusiveStartKey = processes.LastEvaluatedKey;
    }
  } else {
    logger.info('NO_REMAINING_RATE_LIMIT', { githubRetryLimit: githubRetryLimit.data });
  }
}
