import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePullRequestReview } from 'src/lib/save-pull-request-review-details';

export const handler = async function pullRequestReviewIndexDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  try {
    const [record] = event.Records;
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('PULL_REQUEST_REVIEW_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

    await savePullRequestReview(messageBody);
  } catch (error) {
    logger.error('pullRequestReviewIndexDataReciever.error', { error });
  }
};
