import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SprintProcessor } from '../../../processors/sprint';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function sprintFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('SPRINT_SQS_RECIEVER_HANDLER', { messageBody });
        const sprintProcessor = new SprintProcessor(messageBody);
        const validatedData = sprintProcessor.validate();
        if (!validatedData) {
          logger.error('sprintFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await sprintProcessor.processor();
        await sprintProcessor.sendDataToQueue(data, Queue.jira_sprint_index.queueUrl);
      } catch (error) {
        await logProcessToRetry(record, Queue.jira_sprint_format.queueUrl, error as Error);
        logger.error('sprintFormattedDataReciever.error', error);
      }
    })
  );
};
