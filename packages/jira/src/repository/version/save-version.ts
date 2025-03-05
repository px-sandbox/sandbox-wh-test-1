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

export async function saveVersionDetails(
    data: Jira.Type.Version,
): Promise<void> {
    try {
        await esClientObj.putDocument(Jira.Enums.IndexName.Version, data);
        logger.info({ data, message: 'saveVersionDetails.successful' });
    } catch (error: unknown) {
        logger.error({ data, message: 'saveVersionDetails.error', error });
        throw error;
    }
}
