import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveUserDetails } from '../../../repository/user/save-user';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function userIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('USER_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveUserDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.jira_user_index.queueUrl, error as Error);
        logger.error('userIndexDataReciever.error', { error });
      }
    })
  );
};
