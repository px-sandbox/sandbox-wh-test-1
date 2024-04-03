import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { SprintState } from 'abstraction/jira/enums';
import esb from 'elastic-builder';
import { Sprint, searchedDataFormator } from '../util/response-formatter';

/**
 * Creates a search query for retrieving a sprint by its ID.
 * @param sprintId - The ID of the sprint.
 * @returns The search query object.
 */
function createSprintSearchQuery(sprintId: string): object {
  return esb
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
}
/**
 * Retrieves a sprint by its ID.
 * @param sprintId - The ID of the sprint to retrieve.
 * @returns A Promise that resolves to the retrieved sprint.
 */
export async function getSprints(sprintId: string): Promise<Sprint> {
  const esClientObj = ElasticSearchClient.getInstance();
  const query = createSprintSearchQuery(sprintId);
  const body = await esClientObj.search(Jira.Enums.IndexName.Sprint, query);
  const [sprint] = (await searchedDataFormator(body)) as Sprint[];
  return sprint;
}
