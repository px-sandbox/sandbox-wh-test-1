import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveBoardDetails } from '../../../repository/board/save-board';

export const handler = async function boardIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('BOARD_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveBoardDetails(messageBody);
      } catch (error) {
        logger.error('boardIndexDataReciever.error', { error });
      }
    })
  );
};
