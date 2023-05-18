import { APIGatewayProxyEvent } from 'aws-lambda';
import { saveRepoDetails } from 'github/src/lib/save-repo-details';
import { saveUserDetails } from 'github/src/lib/save-user-details';
import { saveBranchDetails } from 'github/src/lib/save-branch-details';
import { logger } from '../logger';

export const handler = async function sqsDataReceiver(event: APIGatewayProxyEvent): Promise<any> {
	for (const record of event.Records) {
		const messageBody = JSON.parse(record.body);
		// Do something with the message, e.g. send an email, process data, etc.
		/*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */

		switch (messageBody.type) {
		case 'git_repo':
			logger.info('getRepoDetails.formatter.invoked');
			// TODO: create repo details library function
			saveRepoDetails(messageBody.data);
			break;
		case 'git_users':
			logger.info('getUsersDetails.formatter.invoked');
			// TODO: create user details library function
			saveUserDetails(messageBody.data);
			break;
		case 'git_branch':
			logger.info('getRBranchDetails.formatter.invoked');
			// TODO: create branch details library function
			saveBranchDetails(messageBody.data);
			break;
		default:
			break;
		}
	}
	return {};
};
