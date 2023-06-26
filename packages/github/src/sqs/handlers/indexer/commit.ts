import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveCommitDetails } from 'src/lib/save-commit-details';

export const handler = async function commitIndexDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  try {
    const [record] = event.Records;
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('COMMIT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

    await saveCommitDetails(messageBody);
  } catch (error) {
    logger.error('commitIndexDataReciever.error', { error });
  }
};
