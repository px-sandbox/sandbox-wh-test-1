/* eslint-disable no-await-in-loop */
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import esb, { BoolQuery } from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github, Other } from 'abstraction';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { searchedDataFormator } from '../../util/response-formatter';

const esClient = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

/**
 * Creates a query object for scanning security updates.
 * @param repoId - The ID of the repository.
 * @param branch - The branch name.
 * @param date - The date of the scan.
 * @returns The query object.
 */
function createScanQuery(repoId: string, branch: string, date: string): BoolQuery {
    return esb.boolQuery().must([
        esb.termQuery('body.repoId', repoId),
        esb.termQuery('body.branch', branch),
    ]).filter(esb.termQuery('body.date', date));
}

/**
 * Formats an array of scan data for bulk insertion.
 * @param data - The array of scan data to be formatted.
 * @returns An array of formatted scan data objects.
 */
function formatScansForBulkInsert(data: (Pick<Other.Type.Hit, "_id"> & Other.Type.HitBody)[]): {
    _id: string;
    body: Other.Type.HitBody;
}[] {
    return data.map((dataItem) => ({
        _id: uuid(),
        body: {
            ...dataItem,
            date: moment().format('YYYY-MM-DD'),
            createdAt: moment().toISOString(),
        },
    }));
}


/**
 * Updates security scans for each record in the SQS event.
 * @param event - The SQS event containing the records to update.
 * @returns A Promise that resolves to void.
 */
export const handler = async function updateSecurityScans(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);

    for (const record of event.Records) {
        try {
            const recordBody: { repoId: string, branch: string, currDate: string } = JSON.parse(record.body);

            const todaysScansQuery = createScanQuery(recordBody.repoId, recordBody.branch, recordBody.currDate);

            const todaysScans = await esClient.
                searchWithEsb(Github.Enums.IndexName.GitRepoSastErrors, todaysScansQuery.toJSON());
            const formattedTodaysScans = await searchedDataFormator(todaysScans);

            if (formattedTodaysScans.length <= 0) {

                const yesterDate = moment().subtract(1, 'days').format("YYYY-MM-DD");
                const yesterScansQuery = createScanQuery(recordBody.repoId, recordBody.branch, yesterDate);

                const yesterdaysData = await esClient.
                    searchWithEsb(Github.Enums.IndexName.GitRepoSastErrors, yesterScansQuery.toJSON());
                const formattedData = await searchedDataFormator(yesterdaysData);

                if (formattedData.length > 0) {
                    const updatedBody = formatScansForBulkInsert(formattedData);

                    logger.info(`Updating scans for repoId: ${recordBody.repoId}, branch: ${recordBody.branch}`);
                    await esClient.bulkInsert(Github.Enums.IndexName.GitRepoSastErrors, updatedBody);
                }
            } else {
                logger.info('Scans found for today');
            }
        } catch (error) {
            logger.error('updateProductSecurityScans.error', error);
        }
    }
};

