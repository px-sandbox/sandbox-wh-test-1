import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Jira } from 'abstraction';
import { SprintState } from 'abstraction/jira/enums';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { searchedDataFormator, Sprint } from '../util/response-formatter';

export async function getSprints(sprintId: string): Promise<Sprint> {
  const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must(esb.termQuery('body.id', sprintId))
        .should([
          esb.termQuery('body.state', SprintState.ACTIVE),
          esb.termQuery('body.state', SprintState.CLOSED),
        ])
        .minimumShouldMatch(1)
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();
  const { body } = await esClientObj.getClient().search({
    index: Jira.Enums.IndexName.Sprint,
    body: query,
  });
  const [sprint] = (await searchedDataFormator(body)) as Sprint[];
  return sprint;
}
