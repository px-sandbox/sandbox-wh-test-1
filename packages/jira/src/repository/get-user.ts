import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';

export async function getUserById(userId: string): Promise<{ _id: string } & Jira.Type.UserBody> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', `${mappingPrefixes.user}_${userId}`).toJSON();
    const userData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.JiraUsers, matchQry);
    const [formattedUserData] = await searchedDataFormator(userData);
    return formattedUserData;
  } catch (error: unknown) {
    logger.error('getUserById.error', { error });
    throw error;
  }
}
