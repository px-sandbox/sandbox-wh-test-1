import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { HitBody } from 'abstraction/other/type';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

const getOrganizationData = async (key: string, value: string): Promise<HitBody> => {
  const matchQry = esb
    .requestBodySearch()
    .query(esb.matchQuery(`body.${key}`, value))
    .toJSON();
  const orgData = await esClientObj.search(Github.Enums.IndexName.GitOrganization, matchQry);
  const [formattedUserData] = await searchedDataFormator(orgData);
  return formattedUserData;
};

export async function getOrganizationById(orgId: string): Promise<HitBody> {
  return getOrganizationData('id', orgId);
}
