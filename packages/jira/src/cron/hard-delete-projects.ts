/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { Config } from 'sst/node/config';
import { Table } from 'sst/node/table';
import { logger } from 'core';
import async from 'async';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import esb from 'elastic-builder';
import ms from 'ms';
import { searchedDataFormatorWithDeleted } from '../util/response-formatter';

// initializing elastic search client
const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

/**
 * Deletes project data from Elasticsearch if project was soft-deleted more than 90 days ago.
 * @param result The search result containing the project IDs to delete.
 * @returns A Promise that resolves when the deletion is complete.
 */
async function deleteProjectData(result: (Pick<Other.Type.Hit, "_id"> & Other.Type.HitBody)[]): Promise<void> {
    try {
        logger.info('starting to delete project, sprint, boards and issues data from elastic search');
        const projectData = result?.
            map((hit) => ({
                projectId: hit.id,
                organizationId: hit.organizationId
            }));

        const indexArr = [
            Jira.Enums.IndexName.Project,
            Jira.Enums.IndexName.Issue,
            Jira.Enums.IndexName.Sprint,
            Jira.Enums.IndexName.Board
        ];
        let deleteQuery = {};

        for (const data of projectData) {

            deleteQuery = esb.boolQuery()
                .must([
                    esb.boolQuery().should([
                        esb.termQuery('body.id', data.projectId),
                        esb.termQuery('body.projectId', data.projectId)
                    ])
                        .minimumShouldMatch(1),
                    esb.boolQuery().should([
                        esb.termQuery('body.organizationId', data.organizationId),
                        esb.termQuery('body.organizationId.keyword', data.organizationId)
                    ]).minimumShouldMatch(1)
                ]).toJSON();
        }

        // deleting all data from ES for project and related sprint, boards and issues
        await esClientObj.deleteByQuery(indexArr, deleteQuery);
        logger.info('deleted project, sprint, boards and issues data from elastic search');
    } catch (err) {
        logger.error('error while deleting project data from elastic search', err);
        throw err;
    }

}

/**
 * Deletes projectId entry from DynamoDB.
 * @param result - The search result from DD.
 * @returns A Promise that resolves when all projects have been deleted from DynamoDB.
 */
async function deleteProjectfromDD(result: (Pick<Other.Type.Hit, "_id"> & Other.Type.HitBody)[]): Promise<void> {
    try {
        logger.info('starting to delete project from dynamo db');

        const parentIds = result?.map((hit) => hit._id);


        // Deleting from dynamo DB in batches of 20
        async.eachLimit(parentIds, 20, async (parentId: any) => {
            const params = {
                TableName: Table.jiraMapping.tableName,
                Key: {
                    'parentId': parentId
                }
            };

            try {
                await new DynamoDbDocClient().delete(params);

                logger.info(`Entry with parentId ${parentId} deleted from dynamo db`);
            } catch (error) {
                logger.error(`Error while deleting entry with parentId ${parentId} from dynamo DB`, error);
                throw error;
            }

        });
    } catch (err) {
        logger.error("Error while preparing delete requests", err);
        throw err;
    }
}

/**
 * Deletes projects that have been marked as deleted and have been deleted for more than 90 days.
 * Deletes the corresponding entries from Elasticsearch and DynamoDB.
 * @returns Promise<void>
 */
export async function handler(): Promise<void> {
    logger.info('Hard delete projects from elastic search and dynamo db function invoked');

    const duration = Config.PROJECT_DELETION_AGE_DAYS;
    const durationInMs = ms(duration);

    if (durationInMs === undefined) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const dateToCompare = new Date(Date.now() - durationInMs);

    const query = esb.boolQuery().must([
        esb.termQuery('body.isDeleted', true),
        esb.rangeQuery('body.deletedAt').lte(dateToCompare.toISOString())
    ]).toJSON();

    logger.info('searching for projects that have been soft-deleted >=90 days ago');

    const result = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Project, query);
    const res = await searchedDataFormatorWithDeleted(result);

    if (res.length > 0) {

        // deleting projects data from projects/sprints/boards/issues document
        await deleteProjectData(res);

        // deleting project record from dynamo DB
        await deleteProjectfromDD(res)

    }

}

