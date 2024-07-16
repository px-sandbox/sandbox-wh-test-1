import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { v4 as uuid } from 'uuid';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { Other } from 'abstraction';
import { JiraClient } from '../lib/jira-client';
import { getOrganization } from 'src/repository/organization/get-organization';

async function checkAndSave(
  organization: string,
  projectId: string,
  boardId: string,
  sprintId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const issues = await jira.getIssues(sprintId);

  logger.info({
    ...reqCtx,
    message: `
  FETCHING ISSUES FOR THIS 
  sprintId: ${sprintId}
  boardId: ${boardId}
  projectId: ${projectId}
  organization: ${organization}
  issues: ${issues.length}
  total: ${Array.from(new Set(issues.map((issue) => issue.id))).length}
  `,
  });
  const sqsClient = SQSClient.getInstance();

  await Promise.all(
    issues.map(async (issue, i) => [
      sqsClient.sendFifoMessage(
        {
          organization,
          projectId,
          boardId,
          sprintId,
          issue,
        },
        Queue.qIssueFormat.queueUrl,
        reqCtx,
        issue.key,
        uuid()
      ),
      sqsClient.sendMessage(
        {
          organization,
          projectId,
          boardId,
          sprintId,
          issue,
          orgId,
        },
        Queue.qReOpenRateMigrator.queueUrl,
        reqCtx
      ),
    ])
  );
  logger.info({ ...reqCtx, message: 'issuesMigrateDataReciever.successful' });
}

export const handler = async function issuesMigrate(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx,
        message: { organization, projectId, originBoardId, sprintId },
      } = JSON.parse(record.body);
      try {
        const org = await getOrganization(organization);
        return checkAndSave(organization, projectId, originBoardId, sprintId, org?.id, reqCtx);
      } catch (error) {
        logger.error({ ...reqCtx, message: JSON.stringify({ error, record }) });
        await logProcessToRetry(record, Queue.qIssueMigrate.queueUrl, error as Error);
        logger.error({ ...reqCtx, message: 'issueMigrateDataReciever.error', error });
      }
    })
  );
};
