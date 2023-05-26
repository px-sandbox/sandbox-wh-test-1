import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveBranchDetails } from 'src/lib/save-branch-details';

export const handler = async function branchIndexDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('BRANCH_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

    saveBranchDetails(messageBody);
  }
};
