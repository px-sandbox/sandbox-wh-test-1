import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Github } from 'abstraction';
import { logger } from 'core';
import { RetryTableMapping } from '../model/retry-table-mapping';
import { Table } from 'sst/node/table';
import { BatchGetCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';

const sqsClient = SQSClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();
const tableName = Table.processRetry.tableName;

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
  const { processIds, queue } = event?.body
    ? JSON.parse(event.body)
    : { processIds: [], queue: undefined };
  let items: Github.Type.QueueMessage[] = [];
  logger.info({
    requestId,
    message: `RetryProcessHandler invoked at: ${new Date().toISOString()}`,
  });
  logger.info({ message: `RetryProcessHandler processIds are:`, data: processIds });
  if (processIds && processIds.length > 0) {
    //create chunks of processIds
    const params = {
      RequestItems: {
        [tableName]: {
          Keys: processIds.map((processId: string) => ({ processId })),
        },
      },
    };
    logger.info({ message: 'dynamoDB_batch_query_params', data: JSON.stringify(params) });
    const data = await dynamodbClient.batchGet<Record<string, Github.Type.QueueMessage[]>>(params);
    items = data && data[tableName] ? data[tableName] : [];
  } else {
    let params;
    if (queue) {
      logger.info({ message: 'RetryProcessHandler with queue is called:', data: queue });
      params = new RetryTableMapping().prepareScanParams(false, queue);
    } else {
      params = new RetryTableMapping().prepareScanParams(true);
    }
    logger.info({ message: 'dynamoDB_scan_query_params', data: JSON.stringify(params) });
    const processes = await dynamodbClient.scan(params);
    if (processes.Count === 0) {
      logger.info({
        requestId,
        message: `RetryProcessHandler no processes found at: ${new Date().toISOString()}`,
      });
      return;
    }
    items = processes.Items as Github.Type.QueueMessage[];
    logger.info({
      requestId,
      message: `RetryProcessHandler_items_to_process`,
      data: items?.length,
    });
  }
  if (items.length === 0) {
    logger.info({
      requestId,
      message: `RetryProcessHandler no items found at: ${new Date().toISOString()}`,
    });
    return;
  }
  await Promise.all(
    items.map((record: unknown) => processIt(record as Github.Type.QueueMessage, requestId))
  );
}
