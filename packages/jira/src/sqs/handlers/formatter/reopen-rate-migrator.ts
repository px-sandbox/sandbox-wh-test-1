/* eslint-disable max-lines-per-function */
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
import { HitBody } from 'abstraction/other/type';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { logProcessToRetry } from 'rp';
import { Jira } from 'abstraction';
import { mappingPrefixes as mp } from '../../../constant/config';
import { getIssueChangelogs } from '../../../lib/get-issue-changelogs';
import { JiraClient } from '../../../lib/jira-client';
import { ParamsMapping } from '../../../model/params-mapping';
import { getIssueStatusForReopenRate } from '../../../util/issue-status';
import { reopenChangelogCals } from '../../../util/reopen-body-formatter';

const ddbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function getParentId(id: string): Promise<string | undefined> {
  const ddbRes = await ddbClient.find(new ParamsMapping().prepareGetParams(id));

  return ddbRes?.parentId as string | undefined;
}

export const handler = async function reopenMigratorInfoQueue(event: SQSEvent): Promise<void> {
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
          message: 'REOPEN_RATE_MIGRATOR_SQS_RECEIVER',
          data: { messageBody },
        });

        const organizationId = messageBody?.orgId;
        const organizationName = messageBody?.organization;
        const boardId =
          messageBody?.boardId ?? messageBody?.issue?.fields?.customfield_10007[0]?.boardId;
        const issueKey = messageBody?.issue?.key;
        const projectId = messageBody?.issue?.fields?.project?.id;
        const projectKey = messageBody?.issue?.fields?.project?.key;
        const sprintId = messageBody?.sprintId;
        const jiraClient = await JiraClient.getClient(organizationName);
        const changelogArr: ChangelogItem[] = await getIssueChangelogs(
          messageBody.issue.id,
          jiraClient
        );

        const issueStatus: HitBody = await getIssueStatusForReopenRate(organizationId, {
          requestId,
          resourceId,
        });

        logger.info({
          message: `reopen.issueStatus.entries, ${JSON.stringify(
            issueStatus
          )}, issueKey ${issueKey}`,
        });

        const reopenEntries = await reopenChangelogCals(
          {
            input: changelogArr,
            issueId: messageBody.issue.id,
            sprintId,
            organizationId,
            boardId,
            issueKey,
            projectId,
            projectKey,
            issueStatus,
          },
          {
            requestId,
            resourceId,
          }
        );

        logger.info({
          requestId,
          resourceId,
          message: `reopen.generated.entries, ${reopenEntries.length}, issueKey ${issueKey}`,
        });

        const newOrganizationID = organizationId?.split('_')[2];
        const parentId = await getParentId(
          `${mp.reopen_rate}_${messageBody.issue.id}_${mp.sprint}_${sprintId}_${mp.org}_${newOrganizationID}`
        );

        await Promise.all(
          reopenEntries.map(async (entry): Promise<void> => {
            const id = parentId || uuid();
            const body = entry;
            await sqsClient.sendMessage(
              { data: { id, body }, index: Jira.Enums.IndexName.ReopenRate },
              Queue.qJiraIndex.queueUrl,
              {
                requestId,
                resourceId,
              }
            );
          })
        );
        logger.info({ requestId, resourceId, message: 'reopenRateInfoQueue.success' });
      } catch (error) {
        logger.error({
          requestId,
          resourceId,
          message: 'reopenRateInfoQueue.error',
          error: `${error}`,
        });
        await logProcessToRetry(record, Queue.qReOpenRateMigrator.queueUrl, error as Error);
      }
    })
  );
};
