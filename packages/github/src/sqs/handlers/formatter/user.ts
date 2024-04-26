import { Github } from 'abstraction';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { UsersProcessor } from '../../../processors/users';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {reqCtx: {requestId, resourceId}, messageBody } = JSON.parse(record.body);

  try {
    logger.info({ message: 'USER_SQS_RECEIVER_HANDLER_FORMATTER', data: messageBody, requestId, resourceId});
    const userProcessor = new UsersProcessor(messageBody, requestId, resourceId );
    const data = await userProcessor.processor();
    await userProcessor.save({ data, eventType: Github.Enums.Event.Organization,processId: messageBody?.processId });
  } catch (error) {
    logger.error({ message: 'userFormattedDataReceiver.error', error, requestId, resourceId });
  }
}

export const handler = async function userFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: "Records Length", data: event.Records.length});
  await Promise.all(
    event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record))
  );
};
