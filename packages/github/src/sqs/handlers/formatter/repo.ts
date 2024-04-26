import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github } from 'abstraction';
import { logProcessToRetry } from '../../../util/retry-process';
import { RepositoryProcessor } from '../../../processors/repo';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({ message: 'REPO_SQS_RECEIVER_HANDLER', data: messageBody, requestId, resourceId });

    const repoProcessor = new RepositoryProcessor(messageBody, requestId, resourceId);
    const data = await repoProcessor.processor();
    await repoProcessor.save({
      data,
      eventType: Github.Enums.Event.Repo,
      processId: messageBody?.processId,
    });
  } catch (error) {
    logger.error({ message: 'repoFormattedDataReceiver.error', requestId, resourceId, error });
    await logProcessToRetry(record, Queue.qGhRepoFormat.queueUrl, error as Error);
  }
}
export const handler = async function repoFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
