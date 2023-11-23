import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
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
  const query = esb.requestBodySearch()
    .query(
      esb.boolQuery()
        .must(esb.termQuery('body.id', sprintId))
        .should([
          esb.termQuery('body.state', SprintState.ACTIVE),
          esb.termQuery('body.state', SprintState.CLOSED),
        ])
        .minimumShouldMatch(1))
  esb.sort('body.startDate', 'desc')
    .toJSON();
  const data = await esClientObj.queryAggs(Jira.Enums.IndexName.Sprint, query);
  const [sprint] = await searchedDataFormator(data) as Sprint[];
  return sprint;
}
