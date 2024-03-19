import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

const getOrganizationData = async (
  key: string,
  value: string
): Promise<Github.Type.Organization> => {
  const matchQry = esb.matchQuery(`body.${key}`, value).toJSON();
  const orgData = await esClientObj.search(Github.Enums.IndexName.GitOrganization, matchQry);
  const [formattedUserData] = await searchedDataFormator(orgData);
  return formattedUserData;
};

//Not being used
// export async function getOrganizationName(
//   orgName: string
// ): Promise<Github.Type.Organization> {
//   return  await getOrganizationData('name', orgName);
// }

export async function getOrganizationById(orgId: string): Promise<Github.Type.Organization> {
  return await getOrganizationData('id', orgId);
}
