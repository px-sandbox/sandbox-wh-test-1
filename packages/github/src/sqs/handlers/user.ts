import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveUserDetails } from 'src/lib/save-user-details';

export const handler = async function sqsDataReceiver(event: APIGatewayProxyEvent): Promise<any> {
  const messageBody = JSON.parse(JSON.stringify(event.body));
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('USER_SQS_RECIEVER_HANDLER', { messageBody });
  // TODO: create repo details library function
  saveUserDetails(messageBody.data);
};
