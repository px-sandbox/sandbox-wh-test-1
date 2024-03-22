import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import async from 'async';
import { Github } from 'abstraction';
import { logProcessToRetry } from '../../../util/retry-process';
import { RepositoryProcessor } from '../../../processors/repo';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('REPO_SQS_RECEIVER_HANDLER', { messageBody });

    const repoProcessor = new RepositoryProcessor(messageBody);
    const data = await repoProcessor.processor();
    await repoProcessor.save({ data, eventType: Github.Enums.Event.Repo });
  } catch (error) {
    logger.error(`repoFormattedDataReceiver.error, ${error}`);
    await logProcessToRetry(record, Queue.qGhRepoFormat.queueUrl, error as Error);
  }
}

export const handler = async function repoFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      processAndStoreSQSRecord(record);
    })
  );
};
