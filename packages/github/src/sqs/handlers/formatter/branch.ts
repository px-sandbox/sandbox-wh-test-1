import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { Branch } from 'src/formatters/branch';

export const handler = async function branchFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<any> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('BRANCH_SQS_RECIEVER_HANDLER', { messageBody });
    new Branch(messageBody).formatter();
  }
};
