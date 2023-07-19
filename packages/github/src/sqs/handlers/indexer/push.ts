import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePushDetails } from 'src/lib/save-push-details';

export const handler = async function pushIndexDataReciever(event: SQSEvent): Promise<void> {
  try {
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      // Do something with the message, e.g. send an email, process data, etc.
      /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
      logger.info('PUSH_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

      await savePushDetails(messageBody);
    }
  } catch (error) {
    logger.error('pushIndexDataReciever.error', { error });
  }
};
