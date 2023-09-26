import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ProjectProcessor } from '../../../processors/project';

/**
 * Handles the formatted data received from the SQS queue for JIRA projects.
 * @param event - The SQS event containing the records.
 * @returns Promise<void>
 */
export const handler = async function projectFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('JIRA_PROJECT_SQS_FORMATER', { messageBody });

        const projectProcessor = new ProjectProcessor(messageBody);
        const validatedData = projectProcessor.validate();
        if (!validatedData) {
          logger.error('projectFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await projectProcessor.processor();
        await projectProcessor.sendDataToQueue(data, Queue.jira_projects_index.queueUrl);
      } catch (error) {
        logger.error('projectFormattedDataReciever.error', error);
      }
    })
  );
};
