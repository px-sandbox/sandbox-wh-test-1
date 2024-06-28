import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { RetryTableMapping } from '../model/retry-table-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();
export async function logProcessToRetry(
  record: SQSRecord,
  queue: string,
  error: Error
): Promise<void> {
  const {
    body,
    attributes: { MessageDeduplicationId, MessageGroupId },
  } = record;
  console.log('logProcessToRetry', record);
  const {
    retry,
    reqCtx: { requestId, resourceId },
    message,
  } = JSON.parse(body);
  try {
    const { processId } = message;
    // entry in dynamodb table
    const retryBody = {
      messageBody: JSON.stringify({ ...message, retry: retry ? retry + 1 : 1 }),
      queue,
      ...(MessageDeduplicationId && MessageGroupId
        ? { MessageGroupId, MessageDeduplicationId }
        : {}),
    };
    await dynamodbClient.put(
      new RetryTableMapping().preparePutParams(processId || requestId, retryBody)
    );
  } catch (err) {
    logger.error({
      requestId,
      resourceId,
      message: JSON.stringify(`logProcessToRetry.failed: ${err}, error: ${error}`),
    });
  }
}
