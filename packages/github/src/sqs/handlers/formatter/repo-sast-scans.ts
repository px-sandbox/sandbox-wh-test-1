import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { fetchDataFromS3, repoSastScansFomatter, storeScanReportToES } from '../../../processors/repo-sast-scans';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function repoSastScansDataReceiver(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                logger.info('REPO_SAST_SCAN_SQS_RECEIVER_HANDLER_FORMATTER', { messageBody });
                const { key, repoId, branch } = messageBody;
                const data = await fetchDataFromS3(key.key);
                const scansFormattedData = await repoSastScansFomatter(data);
                await storeScanReportToES(scansFormattedData, repoId, branch);
                logger.info('REPO_SAST_SCAN_SQS_RECEIVER_HANDLER_FORMATTER_FROMS3', { data });
            } catch (error) {
                await logProcessToRetry(record, Queue.qGhRepoSastError.queueUrl, error as Error);
                logger.error('repoSastScanFormattedDataReceiver.error', error);
            }
        })
    );
};
