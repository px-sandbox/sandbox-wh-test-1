import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { IssueProcessor } from '../../../processors/issue';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function issueFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('ISSUE_SQS_RECIEVER_HANDLER', { messageBody });
        const issueProcessor = new IssueProcessor(messageBody);
        const validatedData = issueProcessor.validate();
        if (!validatedData) {
          logger.error('issueFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await issueProcessor.processor();

        // Only allow those issues which are of projects that are available in the AVAILABLE_PROJECT_KEYS
        const projectKeys = Config.AVAILABLE_PROJECT_KEYS ? Config.AVAILABLE_PROJECT_KEYS.split(',') : [];
        if (!projectKeys.includes(data.body.projectKey))
          logger.info('issueFormattedDataReciever.error', { error: 'Project not available in our system' });
        return;
        await issueProcessor.sendDataToQueue(data, Queue.qIssueIndex.queueUrl);

      } catch (error) {
        await logProcessToRetry(record, Queue.qIssueFormat.queueUrl, error as Error);
        logger.error('issueFormattedDataReciever.error', error);
      }
    })
  );
};
