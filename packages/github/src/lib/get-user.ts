import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import { searchedDataFormator } from '../util/response-formatter';

export async function getUserById(
  userId: string
): Promise<Array<{ _id: string } & Github.Type.UserBody>> {
  const esClientObj = await new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });
  const matchQry = esb.matchQuery('body.id', userId).toJSON();
  const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitUsers, matchQry);
  const formattedUserData = await searchedDataFormator(userData);

  return formattedUserData;
}
