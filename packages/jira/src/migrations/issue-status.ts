import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../util/retry-process';

async function checkAndSave(
    organization: string,
    status: Jira.ExternalType.Api.IssueStatus
): Promise<void> {
    const sqsClient = SQSClient.getInstance();
    await sqsClient.sendMessage(
      {
        ...status,
        organization,
      },
      Queue.qIssueStatusFormat.queueUrl
    );
    logger.info('issueStatusMigrateDataReciever.successful');
}

export const handler = async function issueStatusMigrate(event: SQSEvent): Promise<void> {
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const {
                    organization,
                    status,
                }: { organization: string; status: Jira.ExternalType.Api.IssueStatus } = JSON.parse(record.body);
                return checkAndSave(organization, status);
            } catch (error) {
                logger.error(JSON.stringify({ error, record }));
                await logProcessToRetry(record, Queue.qIssueStatusMigrate.queueUrl, error as Error);
                logger.error('issueStatusMigrateDataReciever.error', error);
            }
        })
    );
};
