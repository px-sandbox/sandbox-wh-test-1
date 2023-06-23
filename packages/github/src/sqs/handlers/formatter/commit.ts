import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { CommitProcessor } from 'src/processors/commit';
import { Queue } from 'sst/node/queue';

export const handler = async function commitFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  // logger.info('commit_SQS_RECIEVER_HANDLER_FORMATER_WITHOUT_FORLOP', {
  //   data: JSON.parse(JSON.stringify(event.Records.body)),
  // });
  const [record] = event.Records;
  const messageBody = JSON.parse(record.body);
  // Do something with the message, e.g. send an email, process data, etc.
  /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
  logger.info('COMMIT_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });

  const commitProcessor = new CommitProcessor(messageBody);
  const validatedData = commitProcessor.validate();
  if (validatedData) {
    const data = await commitProcessor.processor();
    await commitProcessor.sendDataToQueue(data, Queue.gh_commit_index.queueUrl);
  }
};
