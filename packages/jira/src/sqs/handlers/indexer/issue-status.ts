import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveIssueStatusDetails } from '../../../repository/issue/save-issue-status';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function issueStatusIndexDataReciever(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('ISSUE_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

                await saveIssueStatusDetails(messageBody);
            } catch (error) {
                await logProcessToRetry(record, Queue.qIssueStatusIndex.queueUrl, error as Error);
                logger.error('issueStatusIndexDataReciever.error', { error });
            }
        })
    );
};
