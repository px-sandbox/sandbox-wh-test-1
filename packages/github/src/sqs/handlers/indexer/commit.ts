import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveCommitDetails } from 'src/lib/save-commit-details';

export const handler = async function commitIndexDataReciever(event: SQSEvent): Promise<void> {
  try {
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      // Do something with the message, e.g. send an email, process data, etc.
      /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */

      await saveCommitDetails(messageBody);
    }
  } catch (error) {
    logger.error('commitIndexDataReciever.error', { errorInfo: JSON.stringify(error) });
    throw error;
  }
};
