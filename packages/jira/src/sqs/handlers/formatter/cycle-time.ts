import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Jira } from 'abstraction';
import { CycleTimeProcessor } from '../../../processors/cycle-time';

export const handler = async function cycleTimeFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          message: 'CYCLE_TIME_SQS_RECIEVER_HANDLER',
          data: messageBody,
          requestId,
          resourceId,
        });
        const cycleTimeProcessor = new CycleTimeProcessor(messageBody, requestId, resourceId);

        const data = await cycleTimeProcessor.processor();
        await cycleTimeProcessor.save({
          data,
          index: Jira.Enums.IndexName.CycleTime,
          processId: messageBody?.processId,
        });
      } catch (error) {
        logger.error({
          message: 'cycleTimeFormattedDataReciever.error',
          error,
          requestId,
          resourceId,
        });
      }
    })
  );
};
