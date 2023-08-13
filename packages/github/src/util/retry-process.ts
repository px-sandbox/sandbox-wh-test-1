import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSRecord } from 'aws-lambda';
import { RetryTableMapping } from 'src/model/retry-table-mapping';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';

export async function logProcessToRetry(record: SQSRecord, queue: string, error: any) {
  try {
    const {
      body,
      attributes: { MessageDeduplicationId, MessageGroupId },
    } = record;

    const { retry, ...messageBody } = JSON.parse(body);
    //entry in dynamodb table
    const processId = uuid();
    const retryBody = {
      messageBody: { ...messageBody, retry: retry ? retry + 1 : 1 },
      queue,
      MessageGroupId,
      MessageDeduplicationId,
      error,
    };

    await new DynamoDbDocClient().put(
      new RetryTableMapping().preparePutParams(processId, retryBody)
    );
  } catch (err) {
    logger.error(
      JSON.stringify({ message: 'logProcessToRetry.failed', body: { record, queue, error } })
    );
  }
}
