import { Github } from 'abstraction';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { GHCopilotProcessor } from '../../../processors/gh-copilot';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('GH_COPILOT_SQS_RECEIVER_HANDLER', { messageBody });
    const ghCopilotProcessor = new GHCopilotProcessor(messageBody);
    const data = await ghCopilotProcessor.processor();
    await ghCopilotProcessor.save({ data, eventType: Github.Enums.Event.Copilot });
  } catch (error) {
    logger.error(`ghCopilotFormattedDataReceiver.error, ${error}`);
  }
}
export const handler = async function ghCopilotFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record))
  );
};
