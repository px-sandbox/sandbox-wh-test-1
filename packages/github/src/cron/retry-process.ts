import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from '../lib/request-default';
import { RetryTableMapping } from '../model/retry-table-mapping';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';

const dynamodbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function processIt(record: Github.Type.QueueMessage, requestId: string): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId, MessageGroupId } = record;
  try {
    await sqsClient
      .sendMessage(
        { ...JSON.parse(messageBody), processId },
        queue,
        MessageGroupId,
        MessageDeduplicationId
      )
      .then(async () => {
        logger.info({
          message: 'RetryProcessHandlerProcess.success',
          data: { processId, queue },
          requestId,
        });
      })
      .catch((error) => {
        logger.error({ message: 'RetryProcessHandlerProcess.error', error, requestId });
      });
  } catch (error) {
    logger.error({ message: 'RetryProcessHandlerProcess.error', error, requestId });
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const requestId = event.requestContext.requestId;
  logger.info({
    message: 'RetryProcessHandler invoked at',
    data: new Date().toISOString(),
    requestId,
  });
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
      logger.info({
        message: 'RetryProcessHandler process count',
        data: { count: i, date: new Date().toISOString() },
        requestId,
      });
      // eslint-disable-next-line no-await-in-loop
      const processes = await dynamodbClient.scanAllItems(params);
      if (processes.Count === 0) {
        logger.info({
          message: 'RetryProcessHandler_no_processes_found',
          data: { date: new Date().toISOString() },
          requestId,
        });
        return;
      }
      const items = processes.Items ? (processes.Items as Github.Type.QueueMessage[]) : [];
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        items.map((record: unknown) => processIt(record as Github.Type.QueueMessage, requestId))
      );
      logger.info({
        message: 'RetryProcessHandler lastEvaluatedKey:',
        data: processes.LastEvaluatedKey,
        requestId,
      });
      params.ExclusiveStartKey = processes.LastEvaluatedKey;
    }
  } else {
    logger.info({
      message: 'NO_REMAINING_RATE_LIMIT',
      data: { githubRetryLimit: githubRetryLimit.data },
      requestId,
    });
  }
}
