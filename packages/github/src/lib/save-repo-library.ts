import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

export async function saveRepoLibraryDetails(data: Github.Type.RepoLibrary): Promise<void> {
    try {
        const updatedData = { ...data };
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        await esClientObj.putDocument(Github.Enums.IndexName.GitRepoLibrary, updatedData);
        logger.info('saveRepoLibraryDetails.successful');
    } catch (error: unknown) {
        logger.error('saveRepoLibraryDetails.error', {
            error,
        });
        throw error;
    }
}
