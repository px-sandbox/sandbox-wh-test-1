import { DynamoDbDocClient } from "@pulse/dynamodb";
import { Other } from "abstraction";
import { logger } from "core";
import { RetryTableMapping } from "src/model/retry-table-mapping";

const dynamodbClient = DynamoDbDocClient.getInstance();

export async function deleteProcessfromDdb(processId: string | undefined, reqCtx: Other.Type.RequestCtx): Promise<void> {
  if (!processId) {
    return;
  }
  const { requestId, resourceId } = reqCtx;
  logger.info({ message: 'deleting_process_from_DDB',data: processId, requestId, resourceId});
  await dynamodbClient.delete(new RetryTableMapping().prepareDeleteParams(processId));
  logger.info({ message: 'RetryProcessHandlerProcess.delete', data:  processId, requestId, resourceId});
}
