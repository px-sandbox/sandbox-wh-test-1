import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { IssueStatusProcessor } from '../../../processors/issue-status';
import { logProcessToRetry } from 'rp';

export const handler = async function issueStatusFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('ISSUE_STATUS_SQS_RECIEVER_HANDLER', { messageBody });
        const issueStatusProcessor = new IssueStatusProcessor(messageBody);

        const data = await issueStatusProcessor.processor();
        await issueStatusProcessor.save({
          data,
          index: Jira.Enums.IndexName.IssueStatus,
          processId: messageBody?.processId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qIssueStatusFormat.queueUrl, error as Error);
        logger.error('issueStatusFormattedDataReciever.error', error);
      }
    })
  );
};
