import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { PushProcessor } from 'src/processors/push';
import { Queue } from 'sst/node/queue';

export const handler = async function pushFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('PUSH_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });

    const pushProcessor = new PushProcessor(messageBody);
    const validatedData = pushProcessor.validate();
    if (!validatedData) {
      logger.error('pushFormattedDataReciever.error', { error: 'validation failed' });
      return;
    }
    const data = await pushProcessor.processor();
    await pushProcessor.sendDataToQueue(data, Queue.gh_push_index.queueUrl);
  }
};
