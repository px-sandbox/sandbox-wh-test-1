import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { searchedDataFormator } from '../../util/response-formatter';

/**
 * Retrieves the organization ID for a given organization name.
 * @param orgName The name of the organization to retrieve the ID for.
 * @returns A Promise that resolves to an array of objects containing the organization ID and body,
 *  or an empty array if no organization was found.
 */
export async function getOrganization(
  orgName: string
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) | undefined> {
  const _esClient = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });
  const organization = await _esClient.search(Jira.Enums.IndexName.Organization, 'name', orgName);

  const [orgData] = await searchedDataFormator(organization);

  return orgData;
}

/**
 * Retrieves the organization ID for a given organization name.
 * @param orgId The name of the organization to retrieve the ID for.
 * @returns A Promise that resolves to an array of objects containing the organization ID and body,
 *  or an empty array if no organization was found.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getOrganizationById(orgId: string) {
  const _esClient = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  });
  const organization = await _esClient.search(Jira.Enums.IndexName.Organization, 'id', orgId);

  const orgData = await searchedDataFormator(organization);
  return orgData;
}
