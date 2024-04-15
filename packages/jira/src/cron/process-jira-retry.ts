import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Jira } from 'abstraction';
import { RetryTableMapping } from '../model/retry-table-mapping';

const sqsClient = SQSClient.getInstance();
const DynamoDbDocClientObj = DynamoDbDocClient.getInstance();
/**
 * For future implementation we can refer to this link to check if the header contains retry-after:
 *  https://developer.atlassian.com/cloud/jira/platform/rate-limiting/
 *  and then we can wait for that time before retrying the process
 */

async function processIt(record: Jira.Type.QueueMessage): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId, MessageGroupId } = record;
  // send to queue
  logger.info('RetryProcessHandlerProcessData', { processId, queue });
  await sqsClient.sendMessage({ ...JSON.parse(messageBody), processId }, queue, MessageGroupId, MessageDeduplicationId);
  // delete from dynamodb
}

export async function handler(): Promise<void> {
  logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);

  const processes: Jira.Type.QueueMessage[] =
    await DynamoDbDocClientObj.scan<Jira.Type.QueueMessage>(
      new RetryTableMapping().prepareScanParams(1000)
    );

  if (processes.length === 0) {
    logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
    return;
  }

  await Promise.all(processes.map((record: Jira.Type.QueueMessage) => processIt(record)));
}
