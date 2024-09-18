import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { RepositoryProcessor } from '../../../processors/repo';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({ message: 'REPO_SQS_RECEIVER_HANDLER', data: messageBody, requestId, resourceId });

    const processor = new RepositoryProcessor(
      messageBody.action,
      messageBody,
      requestId,
      resourceId,
      messageBody.processId
    );
    await processor.process();
    await processor.save();
  } catch (error) {
    logger.error({ message: 'repoFormattedDataReceiver.error', requestId, resourceId, error });
    await logProcessToRetry(record, Queue.qGhRepoFormat.queueUrl, error as Error);
  }
}
export const handler = async function repoFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
