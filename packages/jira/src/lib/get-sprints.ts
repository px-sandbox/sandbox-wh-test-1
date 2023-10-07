import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { SprintState } from 'abstraction/jira/enums';
import esb from 'elastic-builder';
import { searchedDataFormator, Sprint } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';

export async function getSprints(sprintId: string): Promise<Sprint> {
  const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });
  const query = esb
    .boolQuery()
    .must(esb.termQuery('body.jiraSprintId', sprintId))
    .should([
      esb.termQuery('body.status', SprintState.ACTIVE),
      esb.termQuery('body.status', SprintState.CLOSED),
    ])
    .toJSON();
  const data = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Sprint, query);
  const [sprint] = await searchedDataFormator(data) as Sprint[];
  return sprint;
}
