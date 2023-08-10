import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { PRReviewProcessor } from 'src/processors/pull-request-review';
import { Queue } from 'sst/node/queue';

export const handler = async function pRReviewFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        // Do something with the message, e.g. send an email, process data, etc.
        /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
        logger.info('PULL_REQUEST_REVIEW_SQS_RECIEVER_HANDLER', { messageBody });
        const { review, pullId, repoId, action } = messageBody;
        const prReviewProcessor = new PRReviewProcessor(review, pullId, repoId, action);
        const validatedData = prReviewProcessor.validate();
        if (!validatedData) {
          logger.error('pRReviewFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await prReviewProcessor.processor();
        await prReviewProcessor.sendDataToQueue(data, Queue.gh_pr_review_index.queueUrl);
      } catch (error) {
        logger.error('pRReviewFormattedDataReciever.error', error);
      }
    })
  );
};
