/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { searchedDataFormator } from '../../util/response-formatter';
import { mappingPrefixes } from 'src/constant/config';

const esClient = ElasticSearchClient.getInstance();

/**
 * Creates a query object for scanning security updates.
 * @param repoId - The ID of the repository.
 * @param branch - The branch name.
 * @param date - The date of the scan.
 * @returns The query object.
 */
function createScanQuery(
  repoId: string,
  branch: string,
  date: string,
  from: number,
  size: number
): any {
  return esb
    .requestBodySearch()
    .size(size)
    .from(from)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.repoId', repoId),
          esb.termQuery('body.branch', branch),
          esb.termQuery('body.date', date),
        ])
    )
    .toJSON();
}

/**
 * Formats an array of scan data for bulk insertion.
 * @param data - The array of scan data to be formatted.
 * @returns An array of formatted scan data objects.
 */
function formatScansForBulkInsert(data: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]): {
  _id: string;
  body: Other.Type.HitBody;
}[] {
  // modifying data to be easily sent for ElasticSearch-bulk-insert
  return data.map((dataItem) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, date, createdAt, ...rest } = dataItem;
    return {
      _id: `${mappingPrefixes.sast_errors}_${dataItem.branch}_${dataItem.repoId.replace(
        'gh_repo_',
        ''
      )}_${dataItem.organizationId.replace('gh_org_', '')}_${date}`,
      body: {
        ...rest,
        date: moment().toISOString(),
      },
    };
  });
}

async function getScans(
  repoId: string,
  branch: string,
  date: string,
  allScans = false
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  try {
    logger.info({
      message: `Fetching scans for repoId: ${repoId}, branch: ${branch} and date: ${date}`,
    });

    const limit = 100;
    const records = [];
    let from = 0;
    let result = [];

    do {
      result = [];
      const query = createScanQuery(repoId, branch, date, from, limit);
      const scans = await esClient.search(Github.Enums.IndexName.GitRepoSastErrorCount, query);

      result = await searchedDataFormator(scans);
      from += limit;
      records.push(...result);
    } while (allScans && result.length === limit);

    logger.info({
      message: `Scans found for repoId: ${repoId}, branch: ${branch} and date: ${date}`,
      data: { records_Length: records.length },
    });
    return records;
  } catch (error) {
    logger.error({
      message: `Error while fetching scans for repoId: ${repoId}, branch: ${branch} and date: ${date}`,
      error,
    });
    throw error;
  }
}

/**
 * Updates security scans for only for today based on yesterday's data.
 * @param event - The SQS event containing the records to update.
 * @returns A Promise that resolves to void.
 */
export const handler = async function updateSecurityScans(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event?.Records?.length}` });

  for (const record of event.Records) {
    try {
      const {
        message: { repoId, branch, currDate },
      } = JSON.parse(record.body);
      const todaysScans = await getScans(repoId, branch, currDate, false);

      // will only update scans for today if no scans found for today
      if (todaysScans.length > 0) {
        logger.info({
          message: `Scans found for today (${currDate}) for repoId: ${repoId} and branch: ${branch}`,
        });
        return;
      }

      // extracting yesterday's scans to be copied into today
      const yesterDate = moment().subtract(1, 'days').format('YYYY-MM-DD');

      const yesterdayScans = await getScans(repoId, branch, yesterDate, true);

      // updating scans for today if yesterday's scans found
      if (yesterdayScans.length === 0) {
        logger.info({
          message: `No scans found for Yesterday (${yesterDate}) for repoId: ${repoId} and branch: ${branch}`,
        });
        return;
      }

      // formatting yesterday's scans
      const updatedBody = formatScansForBulkInsert(yesterdayScans);

      // bulk inserting scans for today
      logger.info({ message: `Updating scans for repoId: ${repoId}, branch: ${branch}` });
      await esClient.bulkInsert(Github.Enums.IndexName.GitRepoSastErrorCount, updatedBody);

      logger.info({
        message: `Successfully copied scans for repoId: ${repoId}, branch: ${branch} from ${yesterDate} to ${currDate}`,
      });
    } catch (error) {
      // retrying the update security scans process if any error occurs
      await logProcessToRetry(record, Queue.qGhScansSave.queueUrl, error as Error);
      logger.error({ message: 'updateProductSecurityScans.error', error: `${error}` });
    }
  }
};
