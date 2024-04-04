import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
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

        const data = await sprintProcessor.processor();
        await sprintProcessor.save(
          { data, index: Jira.Enums.IndexName.Sprint },
          Queue.qJiraIndex.queueUrl
        );
      } catch (error) {
        await logProcessToRetry(record, Queue.qSprintFormat.queueUrl, error as Error);
        logger.error('sprintFormattedDataReciever.error', error);
      }
    })
  );
};
