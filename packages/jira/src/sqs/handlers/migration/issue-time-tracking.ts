import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { logProcessToRetry } from '../../../util/retry-process';

const sqsClient = new SQSClient();

/**
 * Handles the migration of issue time tracking data.
 *
 * @param event - The SQS event containing the records to be processed.
 * @returns A Promise that resolves to void.
 */
export const handler = async function issueTimeTrackingMigration(event: SQSEvent): Promise<void> {
  logger.info(`issueTimeTrackingMigration: Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        const issueDataFromApi = await messageBody.jiraClient.getIssue(messageBody.issue?.issueId);
        const { _id, ...rest } = messageBody.issue;

        const modifiedIssue = {
          id: _id,
          body: {
            ...rest,
            timeTracker: {
              estimate: issueDataFromApi?.fields?.timetracking?.originalEstimateSeconds ?? 0,
              actual: issueDataFromApi?.fields?.timetracking?.timeSpentSeconds ?? 0,
            },
          },
        };
        // sending updated issue data to indexer
        await sqsClient.sendMessage(modifiedIssue, Queue.qIssueIndex.queueUrl);
      } catch (error) {
        await logProcessToRetry(record, Queue.qIssueTimeTrackingMigration.queueUrl, error as Error);
        logger.error('issueTimeTrackingMigrationQueue.error', error);
      }
    })
  );
};
