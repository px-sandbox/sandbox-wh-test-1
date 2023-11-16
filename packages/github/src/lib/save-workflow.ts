import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';

export async function saveWorkflowDetails(data: Github.Type.Workflow): Promise<void> {
    try {
        const updatedData = { ...data };
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
        const workflowData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitWorkflow, matchQry);
        const [formattedData] = await searchedDataFormator(workflowData);
        if (workflowData) {
            logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
            updatedData.id = formattedData._id;
        }
        await esClientObj.putDocument(Github.Enums.IndexName.GitWorkflow, updatedData);
        logger.info('saveWorkflowDetails.successful');
    } catch (error: unknown) {
        logger.error('saveWorkflowDetails.error', {
            error,
        });
        throw error;
    }
}
