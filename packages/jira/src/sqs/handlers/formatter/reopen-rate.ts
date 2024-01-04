import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { getIssueChangelogs } from 'src/lib/get-issue-changelogs';
import { JiraClient } from 'src/lib/jira-client';
import { ReopenRateProcessor } from 'src/processors/reopen-rate';
import { getReadyForQAStatusDetails } from 'src/util/issue-status';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                messageBody.sprintId = (messageBody.issue.fields?.customfield_10007 && messageBody.issue.fields.customfield_10007[0]) ?? null;
                logger.info('REOPEN_RATE_SQS_RECEIVER', { messageBody });
                const jiraClient = await JiraClient.getClient(messageBody.organization);
                const changelogArr = await getIssueChangelogs(messageBody.organization, messageBody.issue.id, jiraClient);
                const QaFailed = await getReadyForQAStatusDetails(messageBody.organization);
                if (changelogArr) {
                    logger.info('changelogArr', { changelogLength: changelogArr.length });
                    const changelogItems = changelogArr.flatMap((changelog) => changelog.items);
                    const sprintId = changelogItems.map((items) => {
                        if (items.field === 'Sprint') {
                            return items.to;
                        }
                    });
                    if (sprintId) {
                        messageBody.sprintId = sprintId;
                    }
                    const reOpenCount = changelogItems.filter(
                        (items) => items.to === QaFailed.issueStatusId && items.toString === QaFailed.name
                    ).length;

                    messageBody.reOpenCount = reOpenCount;
                }
                const reOpenRateProcessor = new ReopenRateProcessor(messageBody);
                const validatedData = reOpenRateProcessor.validate();
                if (!validatedData) {
                    logger.error('reopenRateInfoQueue.error', { error: 'validation failed' });
                    return;
                }
                const data = await reOpenRateProcessor.processor();
                if (!data) {
                    logger.error('reopenRateInfoQueue.error', { error: 'processor failed' });
                    return;
                }
                logger.info('reopenRateInfoQueue.success');
            } catch (error) {
                logger.error('reopenRateInfoQueue.error', { error });
                await logProcessToRetry(record, Queue.qReOpenRate.queueUrl, error as Error);
            }
        })
    );
};
