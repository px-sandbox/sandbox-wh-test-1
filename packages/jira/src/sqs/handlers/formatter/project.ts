import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ProjectProcessor } from '../../../processors/project';

/**
 * Handler for formatting Jira project data.
 * @param event - The SQS event.
 * @returns A Promise that resolves when the message is sent to SQS.
 */
export const handler = async (event: SQSEvent): Promise<void> => {
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

        return projectProcessor.sendDataToQueue(data, Queue.jira_projects_index.queueUrl);
      } catch (error) {
        logger.error('projectFormattedDataReciever.error', error);

        throw error;
      }
    })
  );
};
