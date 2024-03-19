import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

export async function getOrganization(
  orgName: string
): Promise<{ _id: string } & Github.Type.Organization> {
  const matchQry = esb.matchQuery('body.name', orgName).toJSON();
  const orgData = await esClientObj.search(Github.Enums.IndexName.GitOrganization, matchQry);
  const [formattedUserData] = await searchedDataFormator(orgData);
  return formattedUserData;
}

export async function getOrganizationById(orgId: string): Promise<{ name: string }> {
  const matchQry = esb.matchQuery('body.id', orgId).toJSON();
  const orgData = await esClientObj.search(Github.Enums.IndexName.GitOrganization, matchQry);
  const [formattedUserData] = await searchedDataFormator(orgData);
  return formattedUserData;
}
