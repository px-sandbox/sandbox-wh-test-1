import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { PushProcessor } from '../../../processors/push';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);

  try {
    logger.info({
      message: 'PUSH_SQS_RECEIVER_HANDLER_FORMATER',
      data: messageBody,
      requestId,
      resourceId,
    });

    const processor = new PushProcessor(messageBody, requestId, resourceId);
    await processor.process();
    await processor.save();
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPushFormat.queueUrl, error as Error);
    logger.error({ message: 'pushFormattedDataReceiver.error', error, requestId, resourceId });
  }
}
export const handler = async function pushFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
