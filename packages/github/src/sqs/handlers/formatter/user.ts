import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { UsersProcessor } from '../../../processors/users';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({
      message: 'USER_SQS_RECEIVER_HANDLER_FORMATTER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const processor = new UsersProcessor(
      messageBody.action,
      messageBody,
      requestId,
      resourceId,
      messageBody.processId
    );
    await processor.process();
    await processor.save();
  } catch (error) {
    logger.error({
      message: 'userFormattedDataReceiver.error',
      error: `${error}`,
      requestId,
      resourceId,
    });
  }
}

export const handler = async function userFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
