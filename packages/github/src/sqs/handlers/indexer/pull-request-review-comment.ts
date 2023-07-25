import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePRReviewComment } from 'src/lib/save-pull-request-review-comment';

export const handler = async function pullRequestReviewCommentIndexDataReciever(
  event: SQSEvent
): Promise<void> {
  try {
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      // Do something with the message, e.g. send an email, process data, etc.
      /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
      logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

      await savePRReviewComment(messageBody);
    }
  } catch (error) {
    logger.error('pRReviewCommentIndexDataReciever.error', { error });
  }
};
