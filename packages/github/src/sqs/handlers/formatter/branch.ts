import { Github } from 'abstraction';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { BranchProcessor } from '../../../processors/branch';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('BRANCH_SQS_RECEIVER_HANDLER', { messageBody });
    const branchProcessor = new BranchProcessor(messageBody);
    const data = await branchProcessor.processor();
    await branchProcessor.save({ data, eventType: Github.Enums.Event.Branch });
  } catch (error) {
    logger.error(`branchFormattedDataReceiver.error, ${error}`);
  }
}
export const handler = async function branchFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await async.eachSeries(event.Records, processAndStoreSQSRecord, (error) => {
    if (error) {
      logger.error(`branchFormattedDataReceiver.error, ${error}`);
    }
  });
};
