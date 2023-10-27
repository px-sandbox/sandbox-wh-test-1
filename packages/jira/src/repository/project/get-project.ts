import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganizationId } from '../organization/get-organization';

/**
 * Retrieves project data from Elasticsearch by project ID.
 * @param projectId The ID of the project to retrieve.
 * @param organization The organization associated with the project.
 * @returns A Promise that resolves to an object containing the project ID and body.
 * @throws An error if the Elasticsearch search fails.
 */
export async function getProjectById(
    projectId: number,
    organization: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
    try {
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const [org] = await getOrganizationId(organization);
        const matchQry =
            esb
                .boolQuery()
                .must([
                    esb.termsQuery('body.id', `${mappingPrefixes.project}_${projectId}`),
                    esb.termQuery('body.organizationId', `${org.id}`),
                ]).toJSON();
        const projectData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Project, matchQry);
        const [formattedProjectData] = await searchedDataFormatorWithDeleted(projectData);
        return formattedProjectData;
    } catch (error: unknown) {
        logger.error('getProjectById.error', { error });
        throw error;
    }
}