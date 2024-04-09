import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
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

        const data = await userProcessor.processor();
        data.processId = messageBody.processId;
        await userProcessor.save({ data, index: Jira.Enums.IndexName.Users });
      } catch (error) {
        await logProcessToRetry(record, Queue.qUserFormat.queueUrl, error as Error);
        logger.error('userFormattedDataReciever.error', error);
      }
    })
  );
};
