import { Github } from 'abstraction';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { UsersProcessor } from '../../../processors/users';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('USER_SQS_RECEIVER_HANDLER_FORMATTER', { messageBody });

    const userProcessor = new UsersProcessor(messageBody);
    const data = await userProcessor.processor();
    await userProcessor.save({ data, eventType: Github.Enums.Event.Organization,processId: messageBody?.processId });
  } catch (error) {
    logger.error('userFormattedDataReceiver.error', error);
  }
}

export const handler = async function userFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record))
  );
};
