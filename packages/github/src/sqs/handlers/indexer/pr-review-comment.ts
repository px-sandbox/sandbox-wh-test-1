import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { savePRReviewComment } from '../../../lib/save-pr-review-comment';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pullRequestReviewCommentIndexDataReciever(
  event: SQSEvent
): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await savePRReviewComment(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhPrReviewCommentIndex.queueUrl, error as Error);
        logger.error('pRReviewCommentIndexDataReciever.error', { error });
      }
    })
  );
};
