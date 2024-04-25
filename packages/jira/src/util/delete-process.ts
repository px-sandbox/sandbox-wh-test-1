import { DynamoDbDocClient } from '@pulse/dynamodb';
import { logger } from 'core';
import { RetryTableMapping } from '../model/retry-table-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();

export async function deleteProcessfromDdb(processId: string | undefined): Promise<void> {
  if (!processId) {
    return;
  }
  logger.info({ message: 'deleting_process_from_DDB', data: { processId } });
  await dynamodbClient.delete(new RetryTableMapping().prepareDeleteParams(processId));
  logger.info({ message: 'RetryProcessHandlerProcess.delete', data: { processId } });
}
