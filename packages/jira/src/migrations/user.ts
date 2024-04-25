import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../util/retry-process';

export const handler = async function userMigration(event: SQSEvent): Promise<void> {
  const sqsClient = SQSClient.getInstance();
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx,
        message: { organization, user },
      } = JSON.parse(record.body);
      try {
        const createdAt = new Date().toISOString();
        const deletedAt = null;
        return sqsClient.sendMessage(
          {
            ...user,
            isDeleted: !!deletedAt,
            deletedAt,
            createdAt,
            organization,
          },
          Queue.qUserFormat.queueUrl,
          reqCtx
        );
      } catch (error) {
        logger.error({ ...reqCtx, message: JSON.stringify({ error, event }) });
        await logProcessToRetry(record, Queue.qUserMigrate.queueUrl, error as Error);
        logger.error({ ...reqCtx, message: 'userMigrateDataReciever.error', error });
      }
    })
  );
};
