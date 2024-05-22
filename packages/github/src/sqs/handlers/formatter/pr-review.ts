import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { PRReviewProcessor } from '../../../processors/pr-review';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({
      message: 'PULL_REQUEST_REVIEW_SQS_RECEIVER_HANDLER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const { review, pullId, repoId, action, orgId } = messageBody;
    const prReviewProcessor = new PRReviewProcessor(
      review,
      pullId,
      repoId,
      action,
      orgId,
      requestId,
      resourceId
    );
    const data = await prReviewProcessor.processor();
    await prReviewProcessor.save({
      data,
      eventType: Github.Enums.Event.PRReview,
      processId: messageBody?.processId,
    });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrReviewFormat.queueUrl, error as Error);
    logger.error({ message: 'pRReviewFormattedDataReceiver.error', error, requestId, resourceId });
  }
}
export const handler = async function pRReviewFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
