import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveGHCopilotReport } from '../../../lib/save-copilot-report';

export const handler = async function ghCopilotIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('GH_COPILOT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveGHCopilotReport(messageBody);
      } catch (error) {
        logger.error('ghCopilotIndexDataReciever.error', { error });
      }
    })
  );
};
