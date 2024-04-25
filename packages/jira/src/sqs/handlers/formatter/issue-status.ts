import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { IssueStatusProcessor } from '../../../processors/issue-status';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function issueStatusFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
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
          message: 'ISSUE_STATUS_SQS_RECIEVER_HANDLER',
          data: { messageBody },
        });
        const issueStatusProcessor = new IssueStatusProcessor(messageBody, requestId, resourceId);

        const data = await issueStatusProcessor.processor();
        await issueStatusProcessor.save({
          data,
          index: Jira.Enums.IndexName.IssueStatus,
          processId: messageBody?.processId,
        });
      } catch (error) {
        await logProcessToRetry(record, Queue.qIssueStatusFormat.queueUrl, error as Error);
        logger.error({
          requestId,
          resourceId,
          message: 'issueStatusFormattedDataReciever.error',
          error,
        });
      }
    })
  );
};
