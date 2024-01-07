import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ReopenRateProcessor } from '../../../processors/reopen-rate';
import { prepareReopenRate } from '../../../util/prepare-reopen-rate';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function reopenInfoQueue(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                // store only when there is only one item in custom_10007 field of issue
                const sprint =
                    messageBody.issue.fields?.customfield_10007 &&
                    messageBody.issue.fields.customfield_10007[0].id;
                messageBody.sprintId = sprint ?? null;
                logger.info('REOPEN_RATE_SQS_RECEIVER', { messageBody });
                const inputData = await prepareReopenRate(messageBody, messageBody.typeOfChangelog);
                if (inputData) {
                    const reOpenRateProcessor = new ReopenRateProcessor(inputData);
                    const validatedData = reOpenRateProcessor.validate();
                    if (!validatedData) {
                        logger.error('reopenRateInfoValidationQueue.error', { error: 'validation failed' });
                        return;
                    }
                    const data = await reOpenRateProcessor.processor();
                    if (!data) {
                        logger.error('reopenRateInfoQueueDATA.error', { error: 'processor failed' });
                        return;
                    }
                    await reOpenRateProcessor.sendDataToQueue(data, Queue.qReOpenRateIndex.queueUrl);
                }
                logger.info('reopenRateInfoQueue.success');
            } catch (error) {
                logger.error(`reopenRateInfoQueue.error ${error}`);
                await logProcessToRetry(record, Queue.qReOpenRate.queueUrl, error as Error);
            }
        })
    );
};
