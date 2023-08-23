import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { PRReviewCommentProcessor } from '../../../processors/pr-review-comment';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pRReviewCommentFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECIEVER_HANDLER', { messageBody });
        const { comment, pullId, repoId, action } = messageBody;
        const prReviewCommentProcessor = new PRReviewCommentProcessor(
          comment,
          pullId,
          repoId,
          action
        );
        const validatedData = prReviewCommentProcessor.validate();
        if (!validatedData) {
          logger.error('pRReviewCommentFormattedDataReciever.error', {
            error: 'validation failed',
          });
          return;
        }
        const data = await prReviewCommentProcessor.processor();
        await prReviewCommentProcessor.sendDataToQueue(
          data,
          Queue.gh_pr_review_comment_index.queueUrl
        );
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_pr_review_comment_format.queueUrl, error as Error);
        logger.error('pRReviewCommentFormattedDataReciever.error', error);
      }
    })
  );
};
