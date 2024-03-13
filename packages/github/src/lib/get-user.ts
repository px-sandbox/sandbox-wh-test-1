import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();
export async function getUserById(
  userId: string
): Promise<Array<{ _id: string } & Github.Type.UserBody>> {
  const matchQry = esb.matchQuery('body.id', userId).toJSON();
  const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitUsers, matchQry);
  const formattedUserData = await searchedDataFormator(userData);

  return formattedUserData;
}
