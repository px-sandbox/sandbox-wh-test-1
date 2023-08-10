import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveRepoDetails } from 'src/lib/save-repo-details';

export const handler = async function repoIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        // Do something with the message, e.g. send an email, process data, etc.
        /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
        logger.info('REPO_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });
        await saveRepoDetails(messageBody);
      } catch (error) {
        logger.error('repoIndexDataReciever.error', { error });
        throw error;
      }
    })
  );
};
