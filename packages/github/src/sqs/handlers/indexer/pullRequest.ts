import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePRDetails } from 'src/lib/savePullDetails';
import { logProcessToRetry } from 'src/util/retryProcess';
import { Queue } from 'sst/node/queue';

export const handler = async function pRIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PULL_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await savePRDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_pr_index.queueUrl, error);
        logger.error('pRIndexDataReciever.error', { error });
      }
    })
  );
};
