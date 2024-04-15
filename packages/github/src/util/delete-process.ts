import { DynamoDbDocClient } from "@pulse/dynamodb";
import { logger } from "core";
import { RetryTableMapping } from "src/model/retry-table-mapping";

const dynamodbClient = DynamoDbDocClient.getInstance();

export async function deleteProcessfromDdb(processId: string | undefined): Promise<void> {
  if (!processId) {
    return;
  }
  logger.info('deleting_process_from_DDB', { processId });
  await dynamodbClient.delete(new RetryTableMapping().prepareDeleteParams(processId));
  logger.info('RetryProcessHandlerProcess.delete', { processId });
}
