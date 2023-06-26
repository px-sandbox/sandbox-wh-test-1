import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { PullRequestProcessor } from 'src/processors/pull-request';
import { Queue } from 'sst/node/queue';

export const handler = async function pullRequestFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  const [record] = event.Records;
  const messageBody = JSON.parse(record.body);
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('PULL_SQS_RECIEVER_HANDLER', { messageBody });

  const pullProcessor = new PullRequestProcessor(messageBody);
  const validatedData = pullProcessor.validate();
  if (!validatedData) {
    logger.error('pullRequestFormattedDataReciever.error', { error: 'validation failed' });
    return;
  }
  const data = await pullProcessor.processor();
  await pullProcessor.sendDataToQueue(data, Queue.gh_pull_request_index.queueUrl);
};
