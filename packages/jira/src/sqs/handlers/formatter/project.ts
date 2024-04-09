import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { ProjectProcessor } from '../../../processors/project';
import { logProcessToRetry } from '../../../util/retry-process';

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

        const data = await projectProcessor.processor();
        data.processId = messageBody.processId;
        return projectProcessor.save({ data, index: Jira.Enums.IndexName.Project });
      } catch (error) {
        await logProcessToRetry(record, Queue.qProjectFormat.queueUrl, error as Error);
        logger.error('projectFormattedDataReciever.error', error);

        throw error;
      }
    })
  );
};
