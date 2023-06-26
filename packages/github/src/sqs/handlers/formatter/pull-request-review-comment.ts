import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { PullRequestReviewCommentProcessor } from 'src/processors/pull-request-review-comment';
import { Queue } from 'sst/node/queue';

export const handler = async function pullRequestReviewCommentFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  const [record] = event.Records;
  const messageBody = JSON.parse(record.body);
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECIEVER_HANDLER', { messageBody });
  const { comment, pullId, repoId } = messageBody;
  const prReviewCommentProcessor = new PullRequestReviewCommentProcessor(comment, pullId, repoId);
  const validatedData = prReviewCommentProcessor.validate();
  if (!validatedData) {
    logger.error('pullRequestReviewCommentFormattedDataReciever.error', {
      error: 'validation failed',
    });
    return;
  }
  const data = await prReviewCommentProcessor.processor();
  await prReviewCommentProcessor.sendDataToQueue(data, Queue.gh_pr_review_comment_index.queueUrl);
};
