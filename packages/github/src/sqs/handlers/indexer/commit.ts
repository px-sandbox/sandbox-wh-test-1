import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveCommitDetails } from '../../../lib/save-commit';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function commitIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('COMMIT_SQS_RECIEVER_HANDLER_INDEXED', { commitId: messageBody.body.id });

        await saveCommitDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_commit_index.queueUrl, error);
        logger.error('commitIndexDataReciever.error', { errorInfo: JSON.stringify(error) });
      }
    })
  );
};
