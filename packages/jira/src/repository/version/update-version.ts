import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';

/**
 * Saves the details of a Jira version to DynamoDB and Elasticsearch.
 * @param data The version data to be saved.
 * @returns A Promise that resolves when the version details have been saved.
 * @throws Throws an error if there was an issue saving the version details.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function updateVersionDetails(versionId: string, name: string, description: string, startDate: string, releaseDate: string): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Version, versionId, {
            body: {
                name,
                description,
                startDate,
                releaseDate,
            },
        });
        logger.info({ data: { versionId, name, description, startDate, releaseDate }, message: 'updateVersionDetails.successful' });
    } catch (error: unknown) {
        logger.error({
            data: versionId,
            message: 'updateVersionDetails.error',
            error,
        });
        throw error;
    }
}
