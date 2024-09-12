import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { GHCopilotProcessor } from '../../../processors/gh-copilot';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({
      message: 'GH_COPILOT_SQS_RECEIVER_HANDLER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const ghCopilotProcessor = new GHCopilotProcessor(messageBody, requestId, resourceId);
    await ghCopilotProcessor.process();
    await ghCopilotProcessor.save();
  } catch (error) {
    logger.error({ message: 'ghCopilotFormattedDataReceiver.error', error, requestId, resourceId });
  }
}
export const handler = async function ghCopilotFormattedDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
