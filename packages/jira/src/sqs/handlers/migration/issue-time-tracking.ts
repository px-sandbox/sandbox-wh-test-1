import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import axios from 'axios';
import { logProcessToRetry } from 'rp';
import { JiraClient } from '../../../lib/jira-client';

const sqsClient = SQSClient.getInstance();

/**
 * Handles the migration of issue time tracking data.
 *
 * @param event - The SQS event containing the records to be processed.
 * @returns A Promise that resolves to void.
 */
export const handler = async function issueTimeTrackingMigration(event: SQSEvent): Promise<void> {
  logger.info({ message: `issueTimeTrackingMigration: Records Length: ${event?.Records?.length}` });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        message: { issue, organization },
        reqCtx: { requestId, resourceId },
      } = JSON.parse(record.body);

      try {
        const jiraClient = await JiraClient.getClient(organization);
        logger.info({
          requestId,
          resourceId,
          message: `issueTimeTrackingMigrQueue: Fetching issue ${issue.issueKey} | ${issue.issueId} from API`,
        });
        const issueDataFromApi = await jiraClient.getIssue(issue?.issueId);

        logger.info({
          requestId,
          resourceId,
          message: `issueTimeTrackingMigrQueue: Fetched issue successfully`,
        });
        const { _id, ...rest } = issue;

        const modifiedIssue = {
          id: _id,
          body: {
            ...rest,
            summary: issueDataFromApi?.fields?.summary ?? '',
            timeTracker: {
              estimate: issueDataFromApi?.fields?.timetracking?.originalEstimateSeconds ?? 0,
              actual: issueDataFromApi?.fields?.timetracking?.timeSpentSeconds ?? 0,
            },
          },
        };
        // sending updated issue data to indexer
        await sqsClient.sendMessage(modifiedIssue, Queue.qIssueIndex.queueUrl, {
          requestId,
          resourceId,
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return;
        }
        await logProcessToRetry(record, Queue.qIssueTimeTrackingMigration.queueUrl, error as Error);
        logger.error({
          requestId,
          resourceId,
          message: 'issueTimeTrackingMigrationQueue.error',
          error,
        });
      }
    })
  );
};
