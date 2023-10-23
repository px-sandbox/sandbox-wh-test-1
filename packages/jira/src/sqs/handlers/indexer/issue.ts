import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveIssueDetails } from '../../../repository/issue/save-issue';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function issueIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('ISSUE_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveIssueDetails(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.jira_issue_index.queueUrl, error as Error);
        logger.error('issueIndexDataReciever.error', { error });
      }
    })
  );
};
