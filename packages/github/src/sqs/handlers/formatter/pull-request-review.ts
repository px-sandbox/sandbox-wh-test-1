import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { PullRequestReviewProcessor } from 'src/processors/pull-request-review';
import { Queue } from 'sst/node/queue';

export const handler = async function pullRequestReviewFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  const [record] = event.Records;
  const messageBody = JSON.parse(record.body);
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('PULL_REQUEST_REVIEW_SQS_RECIEVER_HANDLER', { messageBody });
  const { review, pullId, repoId } = messageBody;
  const prReviewProcessor = new PullRequestReviewProcessor(review, pullId, repoId);
  const validatedData = prReviewProcessor.validate();
  if (!validatedData) {
    logger.error('pullRequestReviewFormattedDataReciever.error', { error: 'validation failed' });
    return;
  }
  const data = await prReviewProcessor.processor();
  await prReviewProcessor.sendDataToQueue(data, Queue.gh_pull_request_review_index.queueUrl);
};
