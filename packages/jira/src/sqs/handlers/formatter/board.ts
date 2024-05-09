import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { BoardProcessor } from '../../../processors/board';
import { logProcessToRetry } from 'rp';

export const handler = async function boardFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          requestId,
          resourceId,
          message: 'JIRA_BOARD_SQS_FORMATER',
          data: { messageBody },
        });

        const boardProcessor = new BoardProcessor(messageBody, requestId, resourceId);

        const data = await boardProcessor.processor();
        data.processId = messageBody.processId;
        await boardProcessor.save({
          data,
          index: Jira.Enums.IndexName.Board,
          processId: messageBody?.processId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qBoardFormat.queueUrl, error as Error);
        logger.error({ requestId, resourceId, message: 'boardFormattedDataReciever.error', error });
      }
    })
  );
};
