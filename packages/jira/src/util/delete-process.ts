import { DynamoDbDocClient } from '@pulse/dynamodb';
import { logger } from 'core';
import { RetryTableMapping } from 'src/model/retry-table-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();

export async function deleteProcessfromDdb(processId: string): Promise<void> {
  await dynamodbClient.delete(new RetryTableMapping().prepareDeleteParams(processId));
  logger.info('RetryProcessHandlerProcess.delete', { processId });
}
