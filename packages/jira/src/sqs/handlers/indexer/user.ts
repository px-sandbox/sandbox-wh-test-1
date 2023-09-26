import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveUserDetails } from '../../../repository/save-user';

export const handler = async function userIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('USER_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveUserDetails(messageBody);
      } catch (error) {
        logger.error('userIndexDataReciever.error', { error });
      }
    })
  );
};
