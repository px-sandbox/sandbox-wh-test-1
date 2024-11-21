import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { PRReviewCommentProcessor } from '../../../processors/pr-review-comment';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({
      message: 'PULL_REQUEST_REVIEW_COMMENT_SQS_RECEIVER_HANDLER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const { comment, pullId, repoId, action, orgId } = messageBody;
    const processor = new PRReviewCommentProcessor(
      comment,
      pullId,
      repoId,
      action,
      orgId,
      requestId,
      resourceId
    );
    await processor.process();
    await processor.save();
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrReviewCommentFormat.queueUrl, error as Error);
    logger.error({
      message: 'pRReviewCommentFormattedDataReceiver.error',
      error,
      requestId,
      resourceId,
    });
  }
}
export const handler = async function pRReviewCommentFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
