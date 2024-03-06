import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { PRReviewCommentProcessor } from '../../../processors/pr-review-comment';
import { logProcessToRetry } from '../../../util/retry-process';
import async from 'async';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECEIVER_HANDLER', { messageBody });
    const { comment, pullId, repoId, action } = messageBody;
    const prReviewCommentProcessor = new PRReviewCommentProcessor(comment, pullId, repoId, action);
    const validatedData = prReviewCommentProcessor.validate();
    if (!validatedData) {
      logger.error('pRReviewCommentFormattedDataReceiver.error', {
        error: 'validation failed',
      });
      return;
    }
    const data = await prReviewCommentProcessor.processor();
    await prReviewCommentProcessor.sendDataToQueue(data, Queue.qGhPrReviewCommentIndex.queueUrl);
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrReviewCommentFormat.queueUrl, error as Error);
    logger.error(`pRReviewCommentFormattedDataReceiver.error, ${error}`);
  }
}
export const handler = async function pRReviewCommentFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await async.eachSeries(event.Records, processAndStoreSQSRecord, (error) => {
    if (error) {
      logger.error(`pRReviewCommentFormattedDataReceiver.error, ${error}`);
    }
  });
};
