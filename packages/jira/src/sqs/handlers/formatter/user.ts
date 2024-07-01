import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { logProcessToRetry } from 'rp';
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
        throw new Error('intentional_error_for_user');
        const userProcessor = new UserProcessor(messageBody, requestId, resourceId);

        const data = await userProcessor.processor();
        await userProcessor.save({
          data,
          index: Jira.Enums.IndexName.Users,
          processId: messageBody?.processId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qUserFormat.queueUrl, error as Error);
        logger.error({ requestId, resourceId, message: 'userFormattedDataReciever.error', error });
      }
    })
  );
};
