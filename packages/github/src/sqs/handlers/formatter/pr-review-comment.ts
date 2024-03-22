import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import async from 'async';
import { Github } from 'abstraction';
import { PRReviewCommentProcessor } from '../../../processors/pr-review-comment';
import { logProcessToRetry } from '../../../util/retry-process';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECEIVER_HANDLER', { messageBody });
    const { comment, pullId, repoId, action } = messageBody;
    const prReviewCommentProcessor = new PRReviewCommentProcessor(comment, pullId, repoId, action);
    const data = await prReviewCommentProcessor.processor();
    await prReviewCommentProcessor.save({
      data,
      eventType: Github.Enums.Event.PRReviewComment,
    });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrReviewCommentFormat.queueUrl, error as Error);
    logger.error(`pRReviewCommentFormattedDataReceiver.error, ${error}`);
  }
}
export const handler = async function pRReviewCommentFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record))
  );
};
