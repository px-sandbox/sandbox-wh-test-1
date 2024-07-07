import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';

async function checkAndSave(
  organization: string,
  status: Jira.ExternalType.Api.IssueStatus,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const sqsClient = SQSClient.getInstance();
  await sqsClient.sendMessage(
    {
      ...status,
      organization,
    },
    Queue.qIssueStatusFormat.queueUrl,
    reqCtx
  );
  logger.info({ ...reqCtx, message: 'issueStatusMigrateDataReciever.successful' });
}

export const handler = async function issueStatusMigrate(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx,
        message: { organization, status },
      } = JSON.parse(record.body);
      try {
        return checkAndSave(organization, status, reqCtx);
      } catch (error) {
        logger.error({ ...reqCtx, message: JSON.stringify({ error, record }) });
        await logProcessToRetry(record, Queue.qIssueStatusMigrate.queueUrl, error as Error);
        logger.error({ ...reqCtx, message: 'issueStatusMigrateDataReciever.error', error });
      }
    })
  );
};
