import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveProjectDetails } from '../../../repository/project/save-project';

/**
 * Handles the SQS event for project indexing data.
 * @param event - The SQS event containing the project data to be indexed.
 * @returns A Promise that resolves when all project data has been indexed.
 */

export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map((record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('PROJECT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });
        return saveProjectDetails(messageBody);
      } catch (error) {
        logger.error('projectIndexDataReciever.error', { error });

        throw error;
      }
    })
  );
};
