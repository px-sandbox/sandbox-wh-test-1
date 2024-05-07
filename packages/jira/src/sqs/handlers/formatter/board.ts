import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { BoardProcessor } from '../../../processors/board';
import { logProcessToRetry } from 'rp';

export const handler = async function boardFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('JIRA_BOARD_SQS_FORMATER', { messageBody });

        const boardProcessor = new BoardProcessor(messageBody);

        const data = await boardProcessor.processor();
        data.processId = messageBody.processId;
        await boardProcessor.save({
          data,
          index: Jira.Enums.IndexName.Board,
          processId: messageBody?.processId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qBoardFormat.queueUrl, error as Error);
        logger.error('boardFormattedDataReciever.error', error);
      }
    })
  );
};
