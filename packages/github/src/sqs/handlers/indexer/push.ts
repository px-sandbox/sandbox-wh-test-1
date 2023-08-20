import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePushDetails } from 'src/lib/save-push-details';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

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
