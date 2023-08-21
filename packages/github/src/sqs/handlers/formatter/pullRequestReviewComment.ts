import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { PRReviewCommentProcessor } from 'src/processors/pullRequestReviewComment';
import { logProcessToRetry } from 'src/util/retryProcess';
import { Queue } from 'sst/node/queue';

export const handler = async function pRReviewCommentFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: any) => {
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
        await logProcessToRetry(record, Queue.gh_pr_review_comment_format.queueUrl, error);
        logger.error('pRReviewCommentFormattedDataReciever.error', error);
      }
    })
  );
};
