import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { ReopenRateProcessor } from '../../../processors/reopen-rate';
import { prepareReopenRate } from '../../../util/prepare-reopen-rate';
import { logProcessToRetry } from 'rp';

/**
 * Processes the record from an SQS queue and performs operations related to reopening rate.
 * @param record - The SQS record to process.
 * @returns A Promise that resolves to void.
 */
async function repoInfoQueueFunc(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    // store only when there is only one item in custom_10007 field of issue

    logger.info({
      requestId,
      resourceId,
      message: 'REOPEN_RATE_SQS_RECEIVER',
      data: { messageBody },
    });
    const inputData = await prepareReopenRate(messageBody, messageBody.typeOfChangelog, {
      requestId,
      resourceId,
    });
    if (inputData) {
      const reOpenRateProcessor = new ReopenRateProcessor(inputData, requestId, resourceId);

      const data = await reOpenRateProcessor.processor();
      if (!data) {
        logger.error({
          requestId,
          resourceId,
          message: 'reopenRateInfoQueueDATA.error',
          error: 'processor failed',
        });
        return;
      }
      await reOpenRateProcessor.save({
        data,
        index: Jira.Enums.IndexName.ReopenRate,
        processId: messageBody?.processId,
      });
    }
    logger.info({ requestId, resourceId, message: 'reopenRateInfoQueue.success' });
  } catch (error) {
    logger.error({ requestId, resourceId, message: `reopenRateInfoQueue.error ${error}` });
    await logProcessToRetry(record, Queue.qReOpenRate.queueUrl, error as Error);
  }
}
/**
 * Handles the reopening of issues in the SQS queue.
 * @param event - The SQS event containing the records.
 * @returns A promise that resolves to void.
 */
export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      await repoInfoQueueFunc(record);
    })
  );
};
