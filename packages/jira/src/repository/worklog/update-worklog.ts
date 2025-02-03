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

export async function updateWorklogDetails(
    data: Jira.Type.Worklog,
): Promise<void> {
    try {
        const worklogId = data.id;
        await esClientObj.updateDocument(Jira.Enums.IndexName.Worklog, worklogId, {
            body: data.body
        });
        logger.info({ data, message: 'updateWorklogDetails.successful' });
    } catch (error: unknown) {
        logger.error({
            data,
            message: 'updateWorklogDetails.error',
            error,
        });
        throw error;
    }
}
