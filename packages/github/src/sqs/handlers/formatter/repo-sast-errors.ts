import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import {
  fetchDataFromS3,
  getSastDataFromES,
  repoSastErrorsFormatter,
  storeSastErrorReportToES,
} from '../../../processors/repo-sast-errors';
import { SastCompositeKeys } from 'abstraction/github/type/repo-sast-errors';
import moment from 'moment';
import { mappingPrefixes } from 'src/constant/config';
import crypto from 'crypto';

const compareAndUpdateData = async (
  apiData: Github.Type.RepoSastErrors[],
  dbData: Github.Type.RepoSastErrors[],
  branch: string
) => {
  const compositeKeys: SastCompositeKeys[] = [
    'errorMsg',
    'ruleId',
    'repoId',
    'fileName',
    'lineNumber',
    'codeSnippet',
  ];

  const createBase64Key = (item: Github.Type.RepoSastErrors, keys: Array<SastCompositeKeys>) => {
    const compositeKey = keys.map((key: SastCompositeKeys) => item.body[key]).join('|');
    return crypto.createHash('sha256').update(compositeKey).digest('base64');
  };

  const apiDataMap = new Map(apiData.map((item) => [createBase64Key(item, compositeKeys), item]));
  const esDataMap = new Map(dbData.map((item) => [createBase64Key(item, compositeKeys), item]));

  const resultData = [];

  // Case 1: Add items that exist in API data but not in ES data
  for (const [id, apiItem] of apiDataMap.entries()) {
    if (!esDataMap.has(id)) {
      resultData.push(apiItem);
    } else {
      // Case 2: Update the `lastReportedOn` key for existing items in ES data
      // and add new metadata for branch if it doesn't exist
      const dbItem = esDataMap.get(id);
      if (dbItem) {
        const branchObj = dbItem.body.metadata.find((item) => item.branch == branch);
        if (branchObj) {
          branchObj.lastReportedOn = moment().toISOString();
        } else {
          dbItem.body.metadata.push(...apiItem.body.metadata);
        }
        resultData.push(dbItem);
      }
    }
  }

  // Case 3: Mark items isResolved true, if they are in ES data but not in API data
  for (const [id, dbItem] of esDataMap.entries()) {
    if (!apiDataMap.has(id)) {
      const branchObj = dbItem.body.metadata.find((item) => item.branch == branch);
      if (branchObj) {
        branchObj.isResolved = true;
      }
      resultData.push(dbItem);
    }
  }

  return resultData;
};

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
    const { s3Obj, repoId, branch, orgId } = messageBody;
    const bucketName = `${process.env.SST_STAGE}-sast-errors`;
    const data: Github.ExternalType.Api.RepoSastErrors = await fetchDataFromS3(
      s3Obj.key,
      bucketName,
      { requestId, resourceId }
    );

    const sastErrorFormattedData = await repoSastErrorsFormatter(data);
    const sastDataFromES = await getSastDataFromES(repoId, orgId);
    const dataForUpdate = await compareAndUpdateData(
      sastErrorFormattedData,
      sastDataFromES,
      branch
    );
    // error counting format
    const date = moment().format('YYYY-MM-DD');
    const errorCountData: Github.Type.RepoSastErrorCount = {
      id: `${mappingPrefixes.sast_errors}_${branch}_${repoId}_${orgId}_${date}`,
      body: {
        repoId: `${mappingPrefixes.repo}_${repoId}`,
        branch,
        organizationId: `${mappingPrefixes.organization}_${orgId}`,
        count: sastErrorFormattedData.length,
        date,
      },
    };

    await storeSastErrorReportToES(dataForUpdate, errorCountData, {
      requestId,
      resourceId,
    });
  } catch (error) {
    await logProcessToRetry(record, Queue.qGhRepoSastError.queueUrl, error as Error);
    logger.error({
      message: 'repoSastScanFormattedDataReceiver.error',
      error: `${error}`,
      requestId,
      resourceId,
    });
  }
}
export const handler = async function repoSastErrorsDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length:', data: event.Records.length });
  await Promise.all(event.Records.map((record: SQSRecord) => processAndStoreSQSRecord(record)));
};
