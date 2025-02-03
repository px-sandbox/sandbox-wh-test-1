import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';

/**
 * Saves the details of a Jira worklog to DynamoDB and Elasticsearch.
 * @param data The worklog data to be saved.
 * @returns A Promise that resolves when the worklog details have been saved.
 * @throws Throws an error if there was an issue saving the worklog details.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function updateWorklogDetails(worklogId: string, timeLogged: number, date: string): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Worklog, worklogId, {
            body: {
                timeLogged,
                date,
            },
        });
        logger.info({ data: worklogId, message: 'updateWorklogDetails.successful' });
    } catch (error: unknown) {
        logger.error({
            data: worklogId,
            message: 'updateWorklogDetails.error',
            error,
        });
        throw error;
    }
}

export async function deleteWorklogDetails(worklogId: string): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Worklog, worklogId, {
            body: {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
            },
        });
        logger.info({ data: worklogId, message: 'deleteWorklogDetails.successful' });
    } catch (error: unknown) {
        logger.error({
            data: worklogId,
            message: 'deleteWorklogDetails.error',
            error,
        });
        throw error;
    }
}
