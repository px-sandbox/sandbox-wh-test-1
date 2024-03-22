import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import async from 'async';
import { Github } from 'abstraction';
import { PRReviewProcessor } from '../../../processors/pr-review';
import { logProcessToRetry } from '../../../util/retry-process';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('PULL_REQUEST_REVIEW_SQS_RECEIVER_HANDLER', { messageBody });
    const { review, pullId, repoId, action } = messageBody;
    const prReviewProcessor = new PRReviewProcessor(review, pullId, repoId, action);
    const data = await prReviewProcessor.processor();
    await prReviewProcessor.save({ data, eventType: Github.Enums.Event.PRReview });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrReviewFormat.queueUrl, error as Error);
    logger.error('pRReviewFormattedDataReceiver.error', error);
  }
}
export const handler = async function pRReviewFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record))
  );
};
