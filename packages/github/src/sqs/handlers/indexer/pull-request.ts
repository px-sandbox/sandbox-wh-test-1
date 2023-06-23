import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePullRequestDetails } from 'src/lib/save-pull-details';

export const handler = async function pullRequestIndexDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  try {
    const [record] = event.Records;
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('PULL_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

    await savePullRequestDetails(messageBody);
  } catch (error) {
    logger.error('pullRequestIndexDataReciever.error', { error });
  }
};
