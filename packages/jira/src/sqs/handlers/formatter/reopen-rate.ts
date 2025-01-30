import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { getOrganization } from '../../../repository/organization/get-organization';
import { ReopenRateProcessor } from '../../../processors/reopen-rate';
import { prepareReopenRate } from '../../../util/prepare-reopen-rate';

const sqsClient = SQSClient.getInstance();
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
      const reOpenRateProcessor = new ReopenRateProcessor(
        inputData,
        requestId,
        resourceId,
        messageBody.processId
      );
      await reOpenRateProcessor.process();
      await reOpenRateProcessor.save();
      logger.info({ requestId, resourceId, message: 'reopenRateInfoQueue.success' });

      return;
    }
    logger.info({
      requestId,
      resourceId,
      message: 'reopenRateInfoQueue.data: NO_DATA_PREPARED_FOR_REOPEN',
    });

    // if issue not exists in reopen rate index, run the migration for reopen-rate
    logger.info({
      message: `Reopen Rate Not fount running migration for reopen rate for issue: ${messageBody.issue.key}`,
    });
    const org = await getOrganization(messageBody.organization);
    await sqsClient.sendMessage(
      { ...messageBody, orgId: org?.id },
      Queue.qReOpenRateMigrator.queueUrl,
      { requestId, resourceId }
    );
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
