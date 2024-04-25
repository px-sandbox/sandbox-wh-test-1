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
  logger.info({
    requestId: processId,
    message: 'RetryProcessHandlerProcessData',
    data: { queue },
  });
  const mssg = JSON.parse(messageBody);
  await sqsClient.sendMessage(
    { ...mssg, processId },
    queue,
    {
      requestId: processId ?? '',
      resourceId:
        mssg.issue?.id ||
        mssg.project?.id ||
        mssg.user?.id ||
        mssg.sprint?.id ||
        mssg.board?.id ||
        mssg?.configuration?.id ||
        '',
    },
    MessageGroupId,
    MessageDeduplicationId
  );
  // delete from dynamodb
}

export async function handler(): Promise<void> {
  logger.info({ message: `RetryProcessHandler invoked at: ${new Date().toISOString()}` });

  const processes: Jira.Type.QueueMessage[] =
    await DynamoDbDocClientObj.scan<Jira.Type.QueueMessage>(
      new RetryTableMapping().prepareScanParams(1000)
    );

  if (processes.length === 0) {
    logger.info({
      message: `RetryProcessHandler no processes found at: ${new Date().toISOString()}`,
    });
    return;
  }

  await Promise.all(processes.map((record: Jira.Type.QueueMessage) => processIt(record)));
}
