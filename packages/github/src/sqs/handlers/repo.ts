import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveRepoDetails } from 'src/lib/save-repo-details';

export const handler = async function sqsDataReceiver(event: APIGatewayProxyEvent): Promise<any> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('REPO_SQS_RECIEVER_HANDLER', { messageBody });
    // TODO: create repo details library function
    saveRepoDetails(messageBody);
  }
};
