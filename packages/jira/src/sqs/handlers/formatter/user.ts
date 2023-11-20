import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { UserProcessor } from '../../../processors/user';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function userFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('JIRA_USER_SQS_FORMATER', { messageBody });

        const userProcessor = new UserProcessor(messageBody);
        const validatedData = userProcessor.validate();
        if (!validatedData) {
          logger.error('userFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await userProcessor.processor();
        await userProcessor.sendDataToQueue(data, Queue.qUserIndex.queueUrl);
      } catch (error) {
        await logProcessToRetry(record, Queue.qUserFormat.queueUrl, error as Error);
        logger.error('userFormattedDataReciever.error', error);
      }
    })
  );
};
