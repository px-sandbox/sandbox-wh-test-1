import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganization } from '../organization/get-organization';

/**
 * Retrieves sprint data by sprint ID.
 * @param sprintId - The ID of the sprint to retrieve.
 * @returns A promise that resolves with the formatted sprint data.
 * @throws An error if the sprint data cannot be retrieved.
 */
export async function getSprintById(
    sprintId: string,
    organization: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
    try {
        const esClientObj = ElasticSearchClient.getInstance();

    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .requestBodySearch().query(esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${mappingPrefixes.sprint}_${sprintId}`),
        esb.termQuery('body.organizationId.keyword', `${orgData.id}`),
      ]))
      .toJSON();
    const sprintData = await esClientObj.search(Jira.Enums.IndexName.Sprint, matchQry);
    const [formattedSprintData] = await searchedDataFormatorWithDeleted(sprintData);
    return formattedSprintData;
  } catch (error: unknown) {
    logger.error('getSprintById.error', { error });
    throw error;
  }
}