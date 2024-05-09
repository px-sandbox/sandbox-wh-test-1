import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import {
  fetchDataFromS3,
  repoSastErrorsFormatter,
  storeSastErrorReportToES,
} from '../../../processors/repo-sast-errors';
import { logProcessToRetry } from 'rp';

async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    logger.info({
      message: 'REPO_SAST_SCAN_SQS_RECEIVER_HANDLER_FORMATTER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const { s3Obj, repoId, branch, orgId, createdAt } = messageBody;
    const bucketName = `${process.env.SST_STAGE}-sast-errors`;
    const data: Github.ExternalType.Api.RepoSastErrors = await fetchDataFromS3(
      s3Obj.key,
      bucketName,
      { requestId, resourceId }
    );
    const sastErrorFormattedData = await repoSastErrorsFormatter(data);
    await storeSastErrorReportToES(sastErrorFormattedData, repoId, branch, orgId, createdAt, {
      requestId,
      resourceId,
    });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhRepoSastError.queueUrl, error as Error);
    logger.error({
      message: 'repoSastScanFormattedDataReceiver.error',
      error,
      requestId,
      resourceId,
    });
  }
}
export const handler = async function repoSastErrorsDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
