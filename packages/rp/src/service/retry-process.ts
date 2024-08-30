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
  const { processIds } = event?.body ? JSON.parse(event.body) : [];

  logger.info({
    requestId,
    message: `RetryProcessHandler invoked at: ${new Date().toISOString()}`,
  });
  logger.info({ message: `RetryProcessHandler processIds are:`, data: processIds });
  const params = new RetryTableMapping().prepareScanParams(processIds);
  logger.info({ message: 'dynamoDB_scan_query_params', data: JSON.stringify(params) });
  const processes = await dynamodbClient.scan(params);

  if (processes.Count === 0) {
    logger.info({
      requestId,
      message: `RetryProcessHandler no processes found at: ${new Date().toISOString()}`,
    });
    return;
  }
  const items = processes.Items as Github.Type.QueueMessage[];
  logger.info({
    requestId,
    message: `RetryProcessHandler_items_to_process`,
    data: items.length,
  });
  await Promise.all(
    items.map((record: unknown) => processIt(record as Github.Type.QueueMessage, requestId))
  );
}
