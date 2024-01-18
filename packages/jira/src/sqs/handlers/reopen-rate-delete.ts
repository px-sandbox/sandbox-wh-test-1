import { Jira, Other } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { getReopenRateDataByIssueId } from 'src/repository/issue/get-issue';
import { saveReOpenRate } from 'src/repository/issue/save-reopen-rate';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../../util/retry-process';

export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                logger.info('reopenRateDeleteQueue', { messageBody });
                const reopenRateData = await getReopenRateDataByIssueId(
                    messageBody.issue.id,
                    messageBody.organization
                );

                if (reopenRateData.length > 0) {
                    reopenRateData.forEach(
                        async (issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => {
                            issueData.isDeleted = true;
                            issueData.deletedAt = moment(messageBody.eventTime).toISOString();
                            const { _id, ...reopenData } = issueData;
                            await saveReOpenRate({ id: _id, body: reopenData } as Jira.Type.Issue);
                        }
                    );
                } else {
                    logger.info(
                        `Delete reopen rate data not found for issueId : ${messageBody.issue.id}`
                    );
                }
                logger.info('reopenRateDeleteQueue.success');
            } catch (error) {
                logger.error(`reopenRateDeleteQueue.error ${error}`);
                await logProcessToRetry(record, Queue.qReOpenRateDelete.queueUrl, error as Error);
            }
        })
    );
};
