import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Jira } from 'abstraction';
import { RetryTableMapping } from '../model/retry-table-mapping';

/**
 * For future implementation we can refer to this link to check if the header contains retry-after:
 *  https://developer.atlassian.com/cloud/jira/platform/rate-limiting/
 *  and then we can wait for that time before retrying the process
*/

async function processIt(record: Jira.Type.QueueMessage): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId } = record;
  // send to queue
  await new SQSClient().sendMessage(JSON.parse(messageBody), queue, MessageDeduplicationId);

  // delete from dynamodb
  await new DynamoDbDocClient().delete(new RetryTableMapping().prepareDeleteParams(processId));
}

export async function handler(): Promise<void> {
  logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);

  const processes = await new DynamoDbDocClient().scan(
    new RetryTableMapping().prepareScanParams()
  );

  if (processes.length === 0) {
    logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
    return;
  }

  await Promise.all(
    processes.map((record: unknown) => processIt(record as Jira.Type.QueueMessage))
  );
  
}
