import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveReOpenRate } from 'src/repository/issue/save-reopen-rate';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function reOpenRateIndexDataReciever(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('Reopen_Rate_SQS_RECEIVER_HANDLER_INDEXED', { messageBody });

                await saveReOpenRate(messageBody);
            } catch (error) {
                await logProcessToRetry(record, Queue.qReOpenRateIndex.queueUrl, error as Error);
                logger.error(`re_open_rateIndexDataReceiver.error, ${error}`);
            }
        })
    );
};
