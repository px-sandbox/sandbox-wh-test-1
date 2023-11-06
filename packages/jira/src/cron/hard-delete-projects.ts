/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { Config } from 'sst/node/config';
import { Table } from 'sst/node/table';
import { RequestParams } from '@elastic/elasticsearch';
import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { logger } from 'core';
import async from 'async';
import { DynamoDbDocClient } from '@pulse/dynamodb';

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
async function deleteProjectData(result: RequestParams.Search<MultiSearchBody>): Promise<void> {
    try {
        logger.info('starting to delete project, sprint, boards and issues data from elastic search');
        const projectData = result.hits?.hits?.
            map((hit: { _source: { body: { id: any; organizationId: any; }; }; }) => ({
                projectId: hit._source.body.id,
                organizationId: hit._source.body.organizationId
            }));

        const indexArr = [
            Jira.Enums.IndexName.Project,
            Jira.Enums.IndexName.Issue,
            Jira.Enums.IndexName.Sprint,
            Jira.Enums.IndexName.Board
        ];
        let deleteQuery = {};
        for (const data of projectData) {

            // delete query for elastic search for projects data based on projectId/id and organizationId
            deleteQuery = {
                bool: {
                    must: [
                        {
                            bool: {
                                should: [
                                    { term: { 'body.id': data.projectId } },
                                    { term: { 'body.projectId': data.projectId } }
                                ],
                                minimum_should_match: 1
                            }
                        },
                        { term: { 'body.organizationId': data.organizationId } }
                    ]
                }
            };
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
async function deleteProjectfromDD(result: RequestParams.Search<MultiSearchBody>): Promise<void> {
    try {
        logger.info('starting to delete project from dynamo db');

        const parentIds = result.hits.hits.map((hit: { _id: any; }) => hit._id);


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
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // query to get projects where isDeleted is true and deletedAt is more than 90 days ago
    const query = {

        bool: {
            must: [
                { match: { 'body.isDeleted': true } },
                { range: { 'body.deletedAt': { lte: ninetyDaysAgo.toISOString() } } }
            ]
        }
    };
    const result = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Project, query);

    if (result?.hits?.hits) {

        // deleting projects data from projects/sprints/boards/issues document
        await deleteProjectData(result);

        // deleting project record from dynamo DB
        await deleteProjectfromDD(result)

    }

}

