import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import _ from 'lodash';
import async from 'async';
import { ReopenRateProcessor } from '../../../processors/reopen-rate';
import { prepareReopenRate } from '../../../util/prepare-reopen-rate';
import { logProcessToRetry } from '../../../util/retry-process';

/**
 * Processes the record from an SQS queue and performs operations related to reopening rate.
 * @param record - The SQS record to process.
 * @returns A Promise that resolves to void.
 */
async function repoInfoQueueFunc(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    // store only when there is only one item in custom_10007 field of issue

    logger.info('REOPEN_RATE_SQS_RECEIVER', { messageBody });
    const inputData = await prepareReopenRate(messageBody, messageBody.typeOfChangelog);
    if (inputData) {
      const reOpenRateProcessor = new ReopenRateProcessor(inputData);
      const validatedData = reOpenRateProcessor.validate();
      if (!validatedData) {
        logger.error('reopenRateInfoValidationQueue.error', { error: 'validation failed' });
        return;
      }
      const data = await reOpenRateProcessor.processor();
      if (!data) {
        logger.error('reopenRateInfoQueueDATA.error', { error: 'processor failed' });
        return;
      }
      await reOpenRateProcessor.sendDataToQueue(data, Queue.qReOpenRateIndex.queueUrl);
    }
    logger.info('reopenRateInfoQueue.success');
  } catch (error) {
    logger.error(`reopenRateInfoQueue.error ${error}`);
    await logProcessToRetry(record, Queue.qReOpenRate.queueUrl, error as Error);
  }
}
/**
 * Handles the reopening of issues in the SQS queue.
 * @param event - The SQS event containing the records.
 * @returns A promise that resolves to void.
 */
export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (record) => {
              await repoInfoQueueFunc(record);
            },
            (error) => {
              if (error) {
                logger.error('reopenRateInfoQueueDATA.error', error);
              }
              resolve('DONE');
            }
          );
        })
    )
  );

  //   await Promise.all(
  //     event.Records.map(async (record: SQSRecord) => {
  //       try {
  //         const messageBody = JSON.parse(record.body);
  //         // store only when there is only one item in custom_10007 field of issue

  //         logger.info('REOPEN_RATE_SQS_RECEIVER', { messageBody });
  //         const inputData = await prepareReopenRate(messageBody, messageBody.typeOfChangelog);
  //         if (inputData) {
  //           const reOpenRateProcessor = new ReopenRateProcessor(inputData);
  //           const validatedData = reOpenRateProcessor.validate();
  //           if (!validatedData) {
  //             logger.error('reopenRateInfoValidationQueue.error', { error: 'validation failed' });
  //             return;
  //           }
  //           const data = await reOpenRateProcessor.processor();
  //           if (!data) {
  //             logger.error('reopenRateInfoQueueDATA.error', { error: 'processor failed' });
  //             return;
  //           }
  //           await reOpenRateProcessor.sendDataToQueue(data, Queue.qReOpenRateIndex.queueUrl);
  //         }
  //         logger.info('reopenRateInfoQueue.success');
  //       } catch (error) {
  //         logger.error(`reopenRateInfoQueue.error ${error}`);
  //         await logProcessToRetry(record, Queue.qReOpenRate.queueUrl, error as Error);
  //       }
  //     })
  //   );
};
