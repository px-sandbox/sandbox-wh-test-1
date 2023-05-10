import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from '../logger';

//import { IndexName } from "px-abstraction";

export const handler = async function sqsDataReceiver(
  event: APIGatewayProxyEvent
): Promise<any> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS*/

    switch (messageBody.type) {
      case 'git_repo':
        logger.info('getRepoDetails.formatter.invoked');
        // TODO: create repo details library function
        //getRepoDetails(messageBody.data);
        break;
      case 'git_users':
        logger.info('getUsersDetails.formatter.invoked');
        // TODO: create user details library function
        //getUserDetails(messageBody.data);
        break;
      case 'git_branch':
        logger.info('getRBranchDetails.formatter.invoked');
        // TODO: create branch details library function
        //getBranchDetails(messageBody.data);
        break;
      default:
        break;
    }
  }
  return {};
};
