import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { PushProcessor } from '../../../processors/push';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pushFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('PUSH_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });

        const pushProcessor = new PushProcessor(messageBody);
        const validatedData = pushProcessor.validate();
        if (!validatedData) {
          logger.error('pushFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await pushProcessor.processor();
        await pushProcessor.sendDataToQueue(data, Queue.gh_push_index.queueUrl);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_push_format.queueUrl, error);
        logger.error('pushFormattedDataReciever.error', error);
      }
    })
  );
};
