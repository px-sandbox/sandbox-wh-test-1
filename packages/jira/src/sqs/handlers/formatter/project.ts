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
  logger.info({ message: `Records Length: ${event.Records.length}` });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          requestId,
          resourceId,
          message: 'JIRA_PROJECT_SQS_FORMATER',
          data: { messageBody },
        });

        const projectProcessor = new ProjectProcessor(messageBody, requestId, resourceId);

        const data = await projectProcessor.processor();
        return projectProcessor.save({
          data,
          index: Jira.Enums.IndexName.Project,
          processId: messageBody?.processId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qProjectFormat.queueUrl, error as Error);
        logger.error({
          requestId,
          resourceId,
          message: 'projectFormattedDataReciever.error',
          error,
        });

        throw error;
      }
    })
  );
};
