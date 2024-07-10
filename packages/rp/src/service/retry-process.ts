import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Github } from 'abstraction';
import { logger } from 'core';
import { RetryTableMapping } from '../model/retry-table-mapping';

const sqsClient = SQSClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();

async function processIt(record: Github.Type.QueueMessage, requestId: string): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId, MessageGroupId } = record;
  const isFifoQueue = queue.includes('.fifo');
  let sendMessagePromise: Promise<void>;
  try {
    if (isFifoQueue) {
      sendMessagePromise = sqsClient.sendFifoMessage(
        { ...JSON.parse(messageBody), processId },
        queue,
        { requestId, resourceId: MessageGroupId },
        MessageGroupId,
        MessageDeduplicationId
      );
    } else {
      sendMessagePromise = sqsClient.sendMessage({ ...JSON.parse(messageBody), processId }, queue, {
        requestId,
        resourceId: '',
      });
    }
    await sendMessagePromise
      .then(async () => {
        logger.info({
          requestId,
          message: 'RetryProcessHandlerProcess.success',
          data: { processId, queue },
        });
      })
      .catch((error) => {
        logger.error({ message: 'RetryProcessHandlerProcess.error', error });
      });
  } catch (error) {
    logger.error({ message: 'RetryProcessHandlerProcess.error', error });
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const requestId = event?.requestContext?.requestId;
  logger.info({
    requestId,
    message: `RetryProcessHandler invoked at: ${new Date().toISOString()}`,
  });
  const limit = 1;
  let itemsCount = 1000;
  const params = new RetryTableMapping().prepareScanParams(limit);
  do {
    // eslint-disable-next-line no-plusplus
    // eslint-disable-next-line no-await-in-loop
    const processes = await dynamodbClient.scan(params);
    if (processes.Count === 0) {
      logger.info({
        requestId,
        message: `RetryProcessHandler no processes found at: ${new Date().toISOString()}`,
      });
      return;
    }

    // a filter to only retry the process that has not been retried more than 3 times
    const items = processes.Items
      ? (processes.Items.filter((item) => {
          const message = JSON.parse(item.messageBody);
          return message.retry <= 3;
        }) as Github.Type.QueueMessage[])
      : [];
    itemsCount -= items.length;
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      items.map((record: unknown) => processIt(record as Github.Type.QueueMessage, requestId))
    );
    logger.info({
      requestId,
      message: `RetryProcessHandler lastEvaluatedKey: ${JSON.stringify(
        processes.LastEvaluatedKey
      )}`,
    });
    if (processes.LastEvaluatedKey === undefined) {
      return;
    }
    params.ExclusiveStartKey = processes.LastEvaluatedKey;
  } while (itemsCount > 0);
}
