import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { SprintProcessor } from '../../../processors/sprint';

export const handler = async function sprintFormattedDataReciever(event: SQSEvent): Promise<void> {
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
          message: 'SPRINT_SQS_RECIEVER_HANDLER',
          data: { messageBody },
        });
        const sprintProcessor = new SprintProcessor(messageBody, requestId, resourceId);
        await sprintProcessor.process();
        await sprintProcessor.save();
      } catch (error) {
        await logProcessToRetry(record, Queue.qSprintFormat.queueUrl, error as Error);
        logger.error({
          requestId,
          resourceId,
          message: 'sprintFormattedDataReciever.error',
          error: `${error}`,
        });
      }
    })
  );
};
