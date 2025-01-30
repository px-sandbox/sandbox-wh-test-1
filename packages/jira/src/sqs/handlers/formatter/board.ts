import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { BoardProcessor } from '../../../processors/board';

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

        const processor = new BoardProcessor(
          messageBody,
          requestId,
          resourceId,
          messageBody.processId
        );

        await processor.process();
        await processor.save();
      } catch (error) {
        await logProcessToRetry(record, Queue.qBoardFormat.queueUrl, error as Error);
        logger.error({ requestId, resourceId, message: 'boardFormattedDataReciever.error', error });
      }
    })
  );
};
