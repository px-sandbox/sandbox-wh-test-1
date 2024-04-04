import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
import { HitBody } from 'abstraction/other/type';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes as mp } from '../../../constant/config';
import { getIssueChangelogs } from '../../../lib/get-issue-changelogs';
import { JiraClient } from '../../../lib/jira-client';
import { ParamsMapping } from '../../../model/params-mapping';
import { getIssueStatusForReopenRate } from '../../../util/issue-status';
import { reopenChangelogCals } from '../../../util/reopen-body-formatter';
import { logProcessToRetry } from '../../../util/retry-process';

const ddbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function getParentId(id: string): Promise<string | undefined> {
  const ddbRes = await ddbClient.find(new ParamsMapping().prepareGetParams(id));

  return ddbRes?.parentId as string | undefined;
}

export const handler = async function reopenMigratorInfoQueue(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('REOPEN_RATE_MIGRATOR_SQS_RECEIVER', { messageBody });

        const organizationId = messageBody?.organization[0]?.id;
        const organizationName = messageBody?.organization[0]?.name;
        const boardId = messageBody?.boardId;
        const issueKey = messageBody?.issue?.key;
        const projectId = messageBody?.issue?.fields?.project?.id;
        const projectKey = messageBody?.issue?.fields?.project?.key;
        const sprintId = messageBody?.sprintId;
        const jiraClient = await JiraClient.getClient(organizationName);
        const changelogArr: ChangelogItem[] = await getIssueChangelogs(
          messageBody.bugId,
          jiraClient
        );

        const issueStatus: HitBody = await getIssueStatusForReopenRate(organizationId);

        logger.info(
          `reopen.issueStatus.entries, ${JSON.stringify(issueStatus)}, issueKey ${issueKey}`
        );

        const reopenEntries = await reopenChangelogCals({
          input: changelogArr,
          issueId: messageBody.bugId,
          sprintId,
          organizationId,
          boardId,
          issueKey,
          projectId,
          projectKey,
          issueStatus,
        });

        logger.info(`reopen.generated.entries, ${reopenEntries.length}, issueKey ${issueKey}`);

        const newOrganizationID = organizationId?.split('_')[2];
        const parentId = await getParentId(
          `${mp.reopen_rate}_${messageBody.bugId}_${mp.sprint}_${sprintId}_${mp.org}_${newOrganizationID}`
        );

        await Promise.all(
          reopenEntries.map(async (entry) => {
            const id = parentId || uuid();
            const body = entry;
            await sqsClient.sendMessage({ id, body }, Queue.qJiraIndex.queueUrl);
          })
        );
        logger.info('reopenRateInfoQueue.success');
      } catch (error) {
        logger.error(`reopenRateInfoQueue.error ${error}`);
        await logProcessToRetry(record, Queue.qReOpenRateMigrator.queueUrl, error as Error);
      }
    })
  );
};
