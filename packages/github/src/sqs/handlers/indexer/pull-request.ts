import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { savePRDetails } from '../../../lib/save-pull-request';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pRIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PULL_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await savePRDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhPrIndex.queueUrl, error as Error);
        logger.error('pRIndexDataReciever.error', { error });
      }
    })
  );
};
