import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganizationId } from '../organization/get-organization';

/**
 * Retrieves a Jira user by their ID.
 * @param userId The ID of the user to retrieve.
 * @returns A promise that resolves with the user data.
 * @throws An error if the user cannot be retrieved.
 */
export async function getUserById(
  userId: string,
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
          esb.termsQuery('body.id', `${mappingPrefixes.user}_${userId}`),
          esb.termQuery('body.organizationId', `${org.id}`),
        ]).toJSON();
    const userData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Users, matchQry);
    const [formattedUserData] = await searchedDataFormatorWithDeleted(userData);
    return formattedUserData;
  } catch (error: unknown) {
    logger.error('getUserById.error', { error });
    throw error;
  }
}
