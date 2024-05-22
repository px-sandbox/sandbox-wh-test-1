import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { BranchProcessor } from '../../../processors/branch';

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
    const branchProcessor = new BranchProcessor(messageBody, requestId, resourceId);
    const data = await branchProcessor.processor();
    await branchProcessor.save({
      data,
      eventType: Github.Enums.Event.Branch,
      processId: messageBody?.processId,
    });
  } catch (error) {
    logger.error({ message: 'branchFormattedDataReceiver.error', error, requestId, resourceId });
  }
}
export const handler = async function branchFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
