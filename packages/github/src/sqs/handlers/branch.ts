import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveBranchDetails } from 'src/lib/save-branch-details';

export const handler = async function sqsDataReceiver(event: APIGatewayProxyEvent): Promise<any> {
  const messageBody = JSON.parse(JSON.stringify(event.body));
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('BRANCH_SQS_RECIEVER_HANDLER', { messageBody });
  // TODO: create repo details library function
  saveBranchDetails(messageBody.data);
};
