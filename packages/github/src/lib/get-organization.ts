import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { HitBody } from 'abstraction/other/type';

const esClientObj = ElasticSearchClientGh.getInstance();

const getOrganizationData = async (
  key: string,
  value: string
): Promise<HitBody> => {
  const matchQry = esb.requestBodySearch().query(esb.matchQuery(`body.${key}`, value)).toJSON();
  const orgData = await esClientObj.search(Github.Enums.IndexName.GitOrganization, matchQry);
  const [formattedUserData] = await searchedDataFormator(orgData);
  return formattedUserData;
};

// Not being used
// export async function getOrganizationName(
//   orgName: string
// ): Promise<Github.Type.Organization> {
//   return  await getOrganizationData('name', orgName);
// }

export async function getOrganizationById(orgId: string): Promise<HitBody> {
  return getOrganizationData('id', orgId);
}
