import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();
export async function getPullRequestById(
  pullId: number
): Promise<Array<{ _id: string } & Github.Type.PullRequestBody>> {
  const matchQry = esb.matchQuery('body.id', `${mappingPrefixes.pull}_${pullId}`).toJSON();
  const pullData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, matchQry);
  const formattedPullData = await searchedDataFormator(pullData);

  return formattedPullData;
}
