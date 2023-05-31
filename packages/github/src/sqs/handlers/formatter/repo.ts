import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { RepositoryProcessor } from 'src/processors/repo';
import { Queue } from 'sst/node/queue';

export const handler = async function repoFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('REPO_SQS_RECIEVER_HANDLER', { messageBody });

    const userProcessor = new RepositoryProcessor(messageBody);
    const validatedData = userProcessor.validate();
    if (validatedData) {
      const data = await userProcessor.processor();
      await userProcessor.sendDataToQueue(data, Queue.gh_repo_index.queueUrl);
    }
  }
};
