import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { PRProcessor } from '../../../processors/pull-request';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pRFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('PULL_SQS_RECIEVER_HANDLER', { messageBody });

        const pullProcessor = new PRProcessor(messageBody);
        const validatedData = pullProcessor.validate();
        if (!validatedData) {
          logger.error('pRFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await pullProcessor.processor();
        await pullProcessor.sendDataToQueue(data, Queue.gh_pr_index.queueUrl);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_pr_format.queueUrl, error as Error);
        logger.error('pRFormattedDataReciever.error', error);
      }
    })
  );
};
