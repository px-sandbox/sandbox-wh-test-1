import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import async from 'async';
import { Github } from 'abstraction';
import { PushProcessor } from '../../../processors/push';
import { logProcessToRetry } from '../../../util/retry-process';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('PUSH_SQS_RECEIVER_HANDLER_FORMATER', { messageBody });

    const pushProcessor = new PushProcessor(messageBody);
    const data = await pushProcessor.processor();
    await pushProcessor.save({ data, eventType: Github.Enums.Event.Commit_Push });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPushFormat.queueUrl, error as Error);
    logger.error('pushFormattedDataReceiver.error', error);
  }
}
export const handler = async function pushFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
