import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { IssueProcessor } from '../../../processors/issue';
import { Jira } from 'abstraction';

/**
 * Formats the issue data received from an SQS record.
 * @param record - The SQS record containing the issue data.
 * @returns A Promise that resolves to void.
 */
async function issueFormatterFunc(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);

  try {
    logger.info({
      requestId,
      resourceId,
      message: 'ISSUE_SQS_RECIEVER_HANDLER',
      data: messageBody,
    });

    const issueProcessor = new IssueProcessor(
      messageBody,
      requestId,
      resourceId,
      messageBody.processId
    );
    await issueProcessor.process();
    if (messageBody.eventName !== Jira.Enums.Event.IssueDeleted) {
      await issueProcessor.save();
    }
  } catch (error) {
    await logProcessToRetry(record, Queue.qIssueFormat.queueUrl, error as Error);
    logger.error({
      requestId,
      resourceId,
      message: 'issueFormattedDataReciever.error',
      error: `${error}`,
    });
  }
}

/**
 * Handles the formatted data received from an SQS event.
 * @param event - The SQS event containing the formatted data.
 * @returns A Promise that resolves to void.
 */
export const handler = async function issueFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info({
    message: `Records Length: ${event.Records.length}`,
  });
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (record) => {
              const { reqCtx } = JSON.parse(record.body);
              logger.info({
                ...reqCtx,
                message: 'ISSUE_SQS_RECIEVER_HANDLER_RECORD',
                data: { record },
              });
              await issueFormatterFunc(record);
            },
            (error) => {
              if (error) {
                logger.error({ message: 'issueFormattedDataReciever.error', error });
              }
              resolve('DONE');
            }
          );
        })
    )
  );
};
