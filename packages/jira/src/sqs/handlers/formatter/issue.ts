import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import _ from 'lodash';
import async from 'async';
import { Jira } from 'abstraction';
import { IssueProcessor } from '../../../processors/issue';
import { logProcessToRetry } from '../../../util/retry-process';

/**
 * Formats the issue data received from an SQS record.
 * @param record - The SQS record containing the issue data.
 * @returns A Promise that resolves to void.
 */
async function issueFormatterFunc(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('ISSUE_SQS_RECIEVER_HANDLER', { messageBody });
    const issueProcessor = new IssueProcessor(messageBody);

    const data = await issueProcessor.processor();
    await issueProcessor.save(
      { data, index: Jira.Enums.IndexName.Issue },
      Queue.qJiraIndex.queueUrl
    );
  } catch (error) {
    await logProcessToRetry(record, Queue.qIssueFormat.queueUrl, error as Error);
    logger.error('issueFormattedDataReciever.error', error);
  }
}

/**
 * Handles the formatted data received from an SQS event.
 * @param event - The SQS event containing the formatted data.
 * @returns A Promise that resolves to void.
 */
export const handler = async function issueFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (record) => {
              logger.info('ISSUE_SQS_RECIEVER_HANDLER_RECORD', { record });
              await issueFormatterFunc(record);
            },
            (error) => {
              if (error) {
                logger.error('issueFormattedDataReciever.error', error);
              }
              resolve('DONE');
            }
          );
        })
    )
  );
};
