import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveProjectDetails } from '../../../lib/save-project';

/**
 * Handles the project index data received from SQS.
 * @param event - The SQS event containing the project data.
 * @returns Promise that resolves when all project data has been saved.
 */
export const handler = async function projectIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PROJECT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveProjectDetails(messageBody);
      } catch (error) {
        logger.error('projectIndexDataReciever.error', { error });
      }
    })
  );
};
