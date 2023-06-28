import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { CommitProcessor } from 'src/processors/commit';
import { Queue } from 'sst/node/queue';

export const handler = async function commitFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('COMMIT_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });

    const commitProcessor = new CommitProcessor(messageBody);
    const validatedData = commitProcessor.validate();
    if (!validatedData) {
      logger.error('commitFormattedDataReciever.error', { error: 'validation failed' });
      return;
    }
    const data = await commitProcessor.processor();
    await commitProcessor.sendDataToQueue(data, Queue.gh_commit_index.queueUrl);
  }
};
