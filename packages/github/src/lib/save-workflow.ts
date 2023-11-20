import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

export async function saveWorkflowDetails(data: Github.Type.Workflow): Promise<void> {
    try {
        const updatedData = { ...data };
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        await esClientObj.putDocument(Github.Enums.IndexName.GitWorkflow, updatedData);
        logger.info('saveWorkflowDetails.successful');
    } catch (error: unknown) {
        logger.error('saveWorkflowDetails.error', {
            error,
        });
        throw error;
    }
}
