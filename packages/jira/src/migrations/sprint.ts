import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { Other } from 'abstraction';
import { logProcessToRetry } from 'rp';
import { JiraClient } from '../lib/jira-client';

async function checkAndSave(
  organization: string,
  projectId: string,
  originBoardId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const sprints = await jira.getSprints(originBoardId);

  const sqsClient = SQSClient.getInstance();

  await Promise.all([
    ...sprints.map(async (sprint) =>
      sqsClient.sendMessage(
        {
          organization,
          projectId,
          originBoardId,
          ...sprint,
        },
        Queue.qSprintFormat.queueUrl,
        reqCtx
      )
    ),
    // TODO: Uncomment this code after implementing the sprint migration
    // ...sprints.map(async (sprint, i) =>
    //   sqsClient.sendMessage(
    //     { organization, projectId, originBoardId, sprintId: sprint.id },
    //     Queue.qIssueMigrate.queueUrl,
    //     reqCtx,
    //     12 * i
    //   )
    // ),
  ]);
}

export const handler = async function migrateSprint(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        message: { organization, projectId, boardId },
        reqCtx,
      } = JSON.parse(record.body);
      try {
        return checkAndSave(organization, projectId, boardId, reqCtx);
      } catch (error) {
        logger.error({ ...reqCtx, message: JSON.stringify({ error, record }) });
        await logProcessToRetry(record, Queue.qSprintMigrate.queueUrl, error as Error);
        logger.error({ ...reqCtx, message: 'sprintMigrateDataReciever.error', error });
      }
    })
  );
};
