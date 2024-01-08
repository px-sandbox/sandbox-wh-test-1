import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { getIssueChangelogs } from 'src/lib/get-issue-changelogs';
import { JiraClient } from 'src/lib/jira-client';
import { getIssueStatusIds } from 'src/util/issue-status';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { reopenChangelogCals } from 'src/util/reopen-body-formatter';
import { SQSClient } from '@pulse/event-handler';
import { v4 as uuid } from 'uuid';
import { logProcessToRetry } from '../../../util/retry-process';

interface BugStatus {
    _id: string;
    id: string;
    issueStatusId: string;
    name: string;
    status: string;
    organizationId: string;
    pxStatus: Jira.Enums.ChangelogStatus;
}

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

                const dynamicEnum: Jira.Type.reopenIssueStatusIds = {
                    Ready_For_Prod: '',
                    QA_Pass_Deploy: '',
                    Ready_For_QA: '',
                    QA_Failed: '',
                    QA_PASSED: '',
                    Ready_For_UAT: '',
                    Deployed_To_QA: '',
                    Done: '',
                };


                const jiraClient = await JiraClient.getClient(organizationName);
                const bugStatusIds = await getIssueStatusIds(organizationId);

                // Populate the dynamic enum values
                bugStatusIds.forEach((status: BugStatus) => {
                    const key = status.pxStatus as keyof Jira.Type.reopenIssueStatusIds;
                    if (Object.prototype.hasOwnProperty.call(dynamicEnum, key)) {
                        dynamicEnum[key] = status.issueStatusId;
                    }
                });

                const changelogArr = await getIssueChangelogs(
                    messageBody.organization,
                    messageBody.bugId,
                    jiraClient
                );

                const changeLogFormattedData: Jira.Type.ReopenRateChangeLog[] = [];


                if (changelogArr) {
                    logger.info('reopen changelogArr length', { changelogLength: changelogArr.length });
                    const changelogItems: any[] = changelogArr.flatMap((changelog) => changelog.items);

                    changelogItems.forEach((item) => {
                        changeLogFormattedData.push(item)
                    });
                }

                // eslint-disable-next-line max-len
                const reopenEntries = await reopenChangelogCals(dynamicEnum, changeLogFormattedData, messageBody.bugId, sprintId, organizationId, boardId, issueKey, projectId)

                reopenEntries.map(async (entry) => {
                    const id = uuid();
                    const body = entry;
                    await new SQSClient().sendMessage({ id, body }, Queue.qReOpenRateIndex.queueUrl);
                });

                logger.info('reopenRateInfoQueue.success');
            } catch (error) {
                logger.error('reopenRateInfoQueue.error', { error });
                await logProcessToRetry(record, Queue.qReOpenRateIndex.queueUrl, error as Error);
            }
        })
    );
};