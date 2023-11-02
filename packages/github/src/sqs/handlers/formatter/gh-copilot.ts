import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { GHCopilotProcessor } from '../../../processors/gh-copilot';

export const handler = async function ghCopilotFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('GH_COPILOT_SQS_RECIEVER_HANDLER', { messageBody });
        const ghCopilotProcessor = new GHCopilotProcessor(messageBody);
        const validatedData = ghCopilotProcessor.validate();
        if (!validatedData) {
          logger.error('ghCopilotFormattedDataReciever.error', { error: 'validation error' });
          return;
        }
        const data = await ghCopilotProcessor.processor();
        await ghCopilotProcessor.sendDataToQueue(data, Queue.qGhCopilotIndex.queueUrl);
      } catch (error) {
        logger.error('ghCopilotFormattedDataReciever.error', error);
      }
    })
  );
};
