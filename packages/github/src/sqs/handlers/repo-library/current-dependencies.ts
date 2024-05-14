import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { saveRepoLibraryDetails } from '../../../lib/save-repo-library';

export const handler = async function currentDependency(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          message: 'CURRENT_DEPENDENCIES_INDEXED',
          data: messageBody,
          requestId,
          resourceId,
        });

        await saveRepoLibraryDetails(messageBody, {
          requestId,
          resourceId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qCurrentDepRegistry.queueUrl, error as Error);
        logger.error({ message: 'currentDependency.error', error, requestId, resourceId });
      }
    })
  );
};
