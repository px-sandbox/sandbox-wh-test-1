import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { UserProcessor } from '../../../processors/user';

export const handler = async function userFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          requestId,
          resourceId,
          message: 'JIRA_USER_SQS_FORMATER',
          data: { messageBody },
        });

        const userProcessor = new UserProcessor(messageBody, requestId, resourceId);

        await userProcessor.process();
        await userProcessor.save();
      } catch (error) {
        await logProcessToRetry(record, Queue.qUserFormat.queueUrl, error as Error);
        logger.error({ requestId, resourceId, message: 'userFormattedDataReciever.error', error });
      }
    })
  );
};
