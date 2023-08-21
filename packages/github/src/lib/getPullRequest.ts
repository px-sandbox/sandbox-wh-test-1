import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator } from '../util/responseFormatter';

export async function getPullRequestById(
  pullId: number
): Promise<Array<{ _id: string } & Github.Type.PullRequestBody>> {
  const esClientObj = await new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });
  const matchQry = esb.matchQuery('body.id', `${mappingPrefixes.pull}_${pullId}`).toJSON();
  const pullData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, matchQry);
  const formattedPullData = await searchedDataFormator(pullData);

  return formattedPullData;
}
