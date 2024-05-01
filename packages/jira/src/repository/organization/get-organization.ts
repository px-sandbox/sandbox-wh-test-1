import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

export async function getOrganization(
  orgName: string
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) | undefined> {
  const query = esb.requestBodySearch().query(esb.termQuery('body.name', orgName)).toJSON();
  const organization = await esClient.search(Jira.Enums.IndexName.Organization, query);

  const [orgData] = await searchedDataFormator(organization);

  return orgData;
}

export async function getOrganizationById(
  orgId: string
): Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const query = esb.requestBodySearch().query(esb.termQuery('body.id', orgId)).toJSON();
  const organization = await esClient.search(Jira.Enums.IndexName.Organization, query);
  const orgData = await searchedDataFormator(organization);
  return orgData;
}
