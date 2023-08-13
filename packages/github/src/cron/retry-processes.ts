import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { RetryTableMapping } from 'src/model/retry-table-mapping';

export async function handler() {
  logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);

  const processes = await new DynamoDbDocClient().scan(
    new RetryTableMapping().prepareScanParams(1000)
  );

  if (processes.length === 0) {
    logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
    return;
  }

  await Promise.all(processes.map((record: any) => processIt(record)));
}

async function processIt(record: any): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId } = record;

  // send to queue
  await new SQSClient().sendMessage(messageBody, queue, MessageDeduplicationId);

  // delete from dynamodb
  await new DynamoDbDocClient().delete(new RetryTableMapping().prepareDeleteParams(processId));
}
