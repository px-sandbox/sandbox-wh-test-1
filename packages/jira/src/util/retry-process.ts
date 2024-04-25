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

  const { retry, requestId, resourceId, message } = JSON.parse(body);
  const { processId } = message;
  try {
    const retryBody = {
      messageBody: JSON.stringify({ ...message, retry: retry ? retry + 1 : 1 }),
      queue,
      resourceId,
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
      message: 'logProcessToRetry.failed',
      data: { record, queue, error },
      error: err,
    });
  }
}
