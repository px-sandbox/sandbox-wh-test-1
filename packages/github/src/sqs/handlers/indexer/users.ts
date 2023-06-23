import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveUserDetails } from 'src/lib/save-user-details';

export const handler = async function userIndexDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  try {
    const [record] = event.Records;
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('USER_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

    await saveUserDetails(messageBody);
  } catch (error) {
    logger.error('userIndexDataReciever.error', { error });
  }
};
