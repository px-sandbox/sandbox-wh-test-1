import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { savePRReview } from '../../../lib/save-pr-review';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pRReviewIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PULL_REQUEST_REVIEW_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await savePRReview(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_pr_review_index.queueUrl, error);
        logger.error('pRReviewIndexDataReciever.error', { error });
      }
    })
  );
};
