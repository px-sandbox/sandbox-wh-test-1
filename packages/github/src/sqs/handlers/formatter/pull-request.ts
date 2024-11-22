import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { PRProcessor } from '../../../processors/pull-request';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({ message: 'PULL_SQS_RECEIVER_HANDLER', data: messageBody, requestId, resourceId });
    const processor = new PRProcessor(messageBody, requestId, resourceId, messageBody.processId);
    await processor.process();
    await processor.save();
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhPrFormat.queueUrl, error as Error);
    logger.error({
      message: 'pRFormattedDataReceiver.error',
      error: `${error}`,
      requestId,
      resourceId,
    });
  }
}

export const handler = async function pRFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (item) => {
              await processAndStoreSQSRecord(item);
            },
            (error) => {
              if (error) {
                logger.error({ message: 'pRFormattedDataReceiver.error', error: `${error}` });
              }
              resolve('Done');
            }
          );
        })
    )
  );
};
