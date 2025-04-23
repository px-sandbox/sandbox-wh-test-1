import { Hit, IOrganisation, IRepo, IformatUserDataResponse } from 'abstraction/github/type';
import { v4 as uuid } from 'uuid';
import { ElasticSearchResponse, FormattedData } from 'abstraction/other/type';

export const searchedDataFormator = async (
  data: ElasticSearchResponse
): Promise<FormattedData[]> => {
  if (data?.hits?.total.value > 0) {
    return data.hits.hits
      .filter(
        (hit: Hit) =>
          typeof hit._source.body.isDeleted === 'undefined' || hit._source.body.isDeleted === false
      )
      .map((hit: Hit) => ({
        _id: hit._id,
        ...hit._source.body,
      }));
  }
  return [];
};

export const formatRepoSastData = async (data: ElasticSearchResponse): Promise<FormattedData[]> => {
  if (data?.hits?.total.value > 0) {
    return data.hits.hits.map((hit: Hit) => ({
      _id: hit._id,
      body: hit._source.body,
    }));
  }
  return [];
};

export const formatUserDataResponse = (
  data: IformatUserDataResponse
): { [key: string]: unknown } => ({
  id: data._id,
  githubId: data.id,
  userName: data.userName,
  avatarUrl: data.avatarUrl,
  organizationId: data.organizationId,
});

export const formatRepoDataResponse = (
  data: Array<IRepo>
): Array<{ id: number; githubId: number; name: string; topics: string; organizationId: string }> =>
  data.map((repo: IRepo) => ({
    id: repo._id,
    githubId: repo.id,
    name: repo.name,
    topics: repo.topics,
    organizationId: repo.organizationId,
  }));

export const formatOrgDataResponse = (
  data: Array<IOrganisation>
): Array<{ id: string; name: string }> =>
  data.map((org: IOrganisation) => ({
    id: org.id,
    name: org.name,
  }));

export const generateUuid = (): string => uuid();
