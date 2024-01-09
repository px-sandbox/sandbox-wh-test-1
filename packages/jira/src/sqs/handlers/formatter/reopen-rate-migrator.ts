import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { getIssueChangelogs } from 'src/lib/get-issue-changelogs';
import { JiraClient } from 'src/lib/jira-client';
import { Queue } from 'sst/node/queue';
import { reopenChangelogCals } from 'src/util/reopen-body-formatter';
import { SQSClient } from '@pulse/event-handler';
import { v4 as uuid } from 'uuid';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function reopenMigratorInfoQueue(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('REOPEN_RATE_MIGRATOR_SQS_RECEIVER', { messageBody });

                const organizationId = messageBody?.organization[0].id;
                const organizationName = messageBody?.organization[0].name;
                const boardId = messageBody?.boardId;
                const issueKey = messageBody?.issue.key;
                const projectId = messageBody?.issue.fields.project.id;
                const sprintId = messageBody?.sprintId;
                const jiraClient = await JiraClient.getClient(organizationName);
                const changelogArr = await getIssueChangelogs(
                    messageBody.organization,
                    messageBody.bugId,
                    jiraClient
                );
                logger.info('changelogArr length', { changelogArr: changelogArr.length });


                // eslint-disable-next-line max-len
                const reopenEntries = await reopenChangelogCals(changelogArr, messageBody.bugId, sprintId, organizationId, boardId, issueKey, projectId)

                logger.info('reopenEntries length', { reopenEntries: reopenEntries.length });
                await Promise.all(reopenEntries.map(async (entry) => {
                    const id = uuid();
                    const body = entry;
                    await new SQSClient().sendMessage({ id, body }, Queue.qReOpenRateIndex.queueUrl);
                }));
                logger.info('reopenRateInfoQueue.success');
            } catch (error) {
                logger.error('reopenRateInfoQueue.error', { error });
                await logProcessToRetry(record, Queue.qReOpenRateMigrator.queueUrl, error as Error);
            }
        })
    );
};