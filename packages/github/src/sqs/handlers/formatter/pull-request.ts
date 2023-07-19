import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { PRProcessor } from 'src/processors/pull-request';
import { Queue } from 'sst/node/queue';

export const handler = async function pRFormattedDataReciever(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);

    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('PULL_SQS_RECIEVER_HANDLER', { messageBody });

    const pullProcessor = new PRProcessor(messageBody);
    const validatedData = pullProcessor.validate();
    if (!validatedData) {
      logger.error('pRFormattedDataReciever.error', { error: 'validation failed' });
      return;
    }
    const data = await pullProcessor.processor();
    await pullProcessor.sendDataToQueue(data, Queue.gh_pr_index.queueUrl);
  }
};
