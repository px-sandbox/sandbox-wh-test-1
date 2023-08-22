import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { savePushDetails } from '../../../lib/save-push';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pushIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PUSH_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });
        await savePushDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_push_index.queueUrl, error);
        logger.error('pushIndexDataReciever.error', { error });
      }
    })
  );
};
