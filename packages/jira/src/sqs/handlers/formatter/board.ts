import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { BoardProcessor } from '../../../processors/board';

export const handler = async function boardFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('JIRA_BOARD_SQS_FORMATER', { messageBody });

        const boardProcessor = new BoardProcessor(messageBody);
        const validatedData = boardProcessor.validate();
        if (!validatedData) {
          logger.error('boardFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await boardProcessor.processor();
        await boardProcessor.sendDataToQueue(data, Queue.jira_board_index.queueUrl);
      } catch (error) {
        logger.error('boardFormattedDataReciever.error', error);
      }
    })
  );
};
