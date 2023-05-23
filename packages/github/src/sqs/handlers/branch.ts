import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveBranchDetails } from 'src/lib/save-branch-details';

export const handler = async function sqsDataReceiver(event: APIGatewayProxyEvent): Promise<any> {
  const messageBody = JSON.parse(event.record.body);
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('USERS_SQS_RECIEVER_HANDLER');
  // TODO: create repo details library function
  saveBranchDetails(messageBody.data);
};
