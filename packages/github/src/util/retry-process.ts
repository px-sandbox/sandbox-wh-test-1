import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { v4 as uuid } from 'uuid';
import { RetryTableMapping } from '../model/retry-table-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();
export async function logProcessToRetry(
  record: SQSRecord,
  queue: string,
  error: Error
): Promise<void> {
  try {
    const {
      body,
      attributes: { MessageDeduplicationId, MessageGroupId },
    } = record;

    const { retry, processId, ...messageBody } = JSON.parse(body);
    // entry in dynamodb table
    const retryBody = {
      messageBody: JSON.stringify({ ...messageBody, retry: retry ? retry + 1 : 1 }),
      queue,
      ...(MessageDeduplicationId && MessageGroupId
        ? { MessageGroupId, MessageDeduplicationId }
        : {}),
    };

    await dynamodbClient.put(new RetryTableMapping().preparePutParams(processId || uuid(), retryBody));
  } catch (err) {
    logger.error(
      JSON.stringify({ message: 'logProcessToRetry.failed', body: { record, queue, err, error } })
    );
  }
}
