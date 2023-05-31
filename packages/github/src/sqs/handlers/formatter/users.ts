import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { UsersProcessor } from 'src/processors/users';
import { Queue } from 'sst/node/queue';

export const handler = async function userFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('USER_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });

    const userProcessor = new UsersProcessor(messageBody);
    const validatedData = userProcessor.validate();
    if (validatedData) {
      const data = await userProcessor.processor();
      await userProcessor.sendDataToQueue(data, Queue.gh_users_index.queueUrl);
    }
  }
};
