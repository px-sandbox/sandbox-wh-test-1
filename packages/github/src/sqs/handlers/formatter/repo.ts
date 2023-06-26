import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { RepositoryProcessor } from 'src/processors/repo';
import { Queue } from 'sst/node/queue';

export const handler = async function repoFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  const [record] = event.Records;
  const messageBody = JSON.parse(record.body);
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('REPO_SQS_RECIEVER_HANDLER', { messageBody });

  const repoProcessor = new RepositoryProcessor(messageBody);
  const validatedData = repoProcessor.validate();
  if (!validatedData) {
    logger.error('repoFormattedDataReciever.error', { error: 'validation failed' });
    return;
  }
  const data = await repoProcessor.processor();
  await repoProcessor.sendDataToQueue(data, Queue.gh_repo_index.queueUrl);
};
