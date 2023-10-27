import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveBoardDetails } from '../../../repository/board/save-board';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function boardIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('BOARD_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveBoardDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.jira_board_index.queueUrl, error as Error);
        logger.error('boardIndexDataReciever.error', { error });
      }
    })
  );
};
