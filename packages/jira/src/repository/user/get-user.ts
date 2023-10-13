import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';

/**
 * Retrieves a Jira user by their ID.
 * @param userId The ID of the user to retrieve.
 * @returns A promise that resolves with the user data.
 * @throws An error if the user cannot be retrieved.
 */
export async function getUserById(
  userId: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', `${mappingPrefixes.user}_${userId}`).toJSON();
    const userData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Users, matchQry);
    const [formattedUserData] = await searchedDataFormatorWithDeleted(userData);
    return formattedUserData;
  } catch (error: unknown) {
    logger.error('getUserById.error', { error });
    throw error;
  }
}
