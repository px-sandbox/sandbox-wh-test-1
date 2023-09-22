import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { UserProcessor } from '../../../processors/user';

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
        await userProcessor.sendDataToQueue(data, Queue.jira_users_index.queueUrl);
      } catch (error) {
        logger.error('userFormattedDataReciever.error', error);
      }
    })
  );
};
