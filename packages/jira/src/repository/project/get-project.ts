import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganization } from '../organization/get-organization';

/**
 * Retrieves project data from Elasticsearch by project ID.
 * @param projectId The ID of the project to retrieve.
 * @param organization The organization associated with the project.
 * @returns A Promise that resolves to an object containing the project ID and body.
 * @throws An error if the Elasticsearch search fails.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function getProjectById(
    projectId: number,
    organization: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
      const matchQry = esb
      .requestBodySearch().query(esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${mappingPrefixes.project}_${projectId}`),
        esb.termQuery('body.organizationId', `${orgData.id}`),
      ]))
      .toJSON();
    const projectData = await esClientObj.search(Jira.Enums.IndexName.Project, matchQry);
    const [formattedProjectData] = await searchedDataFormatorWithDeleted(projectData);
    return formattedProjectData;
  } catch (error: unknown) {
    logger.error('getProjectById.error', { error });
    throw error;
  }
}