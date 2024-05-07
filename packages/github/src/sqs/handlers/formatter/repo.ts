import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github } from 'abstraction';
import { RepositoryProcessor } from '../../../processors/repo';
import { logProcessToRetry } from 'rp';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('REPO_SQS_RECEIVER_HANDLER', { messageBody });

    const repoProcessor = new RepositoryProcessor(messageBody);
    const data = await repoProcessor.processor();
    await repoProcessor.save({
      data,
      eventType: Github.Enums.Event.Repo,
      processId: messageBody?.processId,
    });
  } catch (error) {
    logger.error(`repoFormattedDataReceiver.error, ${error}`);
    await logProcessToRetry(record, Queue.qGhRepoFormat.queueUrl, error as Error);
  }
}

export const handler = async function repoFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
