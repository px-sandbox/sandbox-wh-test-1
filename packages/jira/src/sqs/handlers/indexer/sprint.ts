import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveSprintDetails } from '../../../repository/save-sprint';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function sprintIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('SPRINT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveSprintDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.jira_sprint_index.queueUrl, error as Error);
        logger.error('sprintIndexDataReciever.error', { error });
      }
    })
  );
};
