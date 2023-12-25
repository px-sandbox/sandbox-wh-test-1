import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import {
    fetchDataFromS3,
    repoSastErrorsFormatter,
    storeSastErrorReportToES,
} from '../../../processors/repo-sast-errors';
import { logProcessToRetry } from '../../../util/retry-process';
import { Github } from 'abstraction';

export const handler = async function repoSastErrorsDataReceiver(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                logger.info('REPO_SAST_SCAN_SQS_RECEIVER_HANDLER_FORMATTER', { messageBody });
                const { s3Obj, repoId, branch, orgId, createdAt } = messageBody;
                const bucketName = `${process.env.SST_STAGE}-sast-errors`;
                const data: Github.ExternalType.Api.RepoSastErrors = await fetchDataFromS3(s3Obj.key, bucketName);
                const sastErrorFormattedData = await repoSastErrorsFormatter(data);
                await storeSastErrorReportToES(sastErrorFormattedData, repoId, branch, orgId, createdAt);
            } catch (error) {
                await logProcessToRetry(record, Queue.qGhRepoSastError.queueUrl, error as Error);
                logger.error('repoSastScanFormattedDataReceiver.error', error);
            }
        })
    );
};
