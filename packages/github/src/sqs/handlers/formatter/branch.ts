import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { BranchProcessor } from '../../../processors/branch';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({
      message: 'processAndStoreSQSRecord.info: BRANCH_SQS_RECEIVER_HANDLER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const { action, processId, ...eventData } = messageBody;
    const processor = new BranchProcessor(action, eventData, processId, requestId, resourceId);
    await processor.process();
    await processor.save();
  } catch (error) {
    logger.error({ message: 'branchFormattedDataReceiver.error', error, requestId, resourceId });
    await logProcessToRetry(record, Queue.qGhBranchFormat.queueUrl, error as Error);
    throw new Error(`branchFormattedDataReceiver.error:${JSON.stringify(error)}`);
  }
}
export const handler = async function branchFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
