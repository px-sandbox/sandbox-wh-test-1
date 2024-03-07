import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { GHCopilotProcessor } from '../../../processors/gh-copilot';
import async from 'async';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('GH_COPILOT_SQS_RECEIVER_HANDLER', { messageBody });
    const ghCopilotProcessor = new GHCopilotProcessor(messageBody);
    const validatedData = ghCopilotProcessor.validate();
    if (!validatedData) {
      logger.error('ghCopilotFormattedDataReceiver.error', { error: 'validation error' });
      return;
    }
    const data = await ghCopilotProcessor.processor();
    await ghCopilotProcessor.indexDataToES({ data, eventType: 'ghCopilot' });
  } catch (error) {
    logger.error(`ghCopilotFormattedDataReceiver.error, ${error}`);
  }
}
export const handler = async function ghCopilotFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await async.eachSeries(event.Records, processAndStoreSQSRecord, (error) => {
    if (error) {
      logger.error(`ghCopilotFormattedDataReceiver.error, ${error}`);
    }
  });
};
