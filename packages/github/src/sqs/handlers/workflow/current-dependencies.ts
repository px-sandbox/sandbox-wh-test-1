import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveWorkflowDetails } from '../../../lib/save-workflow';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function currentDependency(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('WORKFLOW_CURRENT_DEPENDENCIES_INDEXED', { messageBody });

                await saveWorkflowDetails(messageBody);

            } catch (error) {
                await logProcessToRetry(record, Queue.qCurrentDepRegistry.queueUrl, error as Error);
                logger.error('currentDependency.error', { error });
            }
        })
    );
};
