import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePRReview } from 'src/lib/save-pull-request-review-details';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

export const handler = async function pRReviewIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const messageBody = JSON.parse(record.body);
        // Do something with the message, e.g. send an email, process data, etc.
        /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
        logger.info('PULL_REQUEST_REVIEW_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await savePRReview(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_pr_review_index.queueUrl, error);
        logger.error('pRReviewIndexDataReciever.error', { error });
      }
    })
  );
};
