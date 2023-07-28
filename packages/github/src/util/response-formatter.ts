import { estypes } from '@elastic/elasticsearch';

export interface IformatUserDataResponse {
  _id: number;
  id: number;
  githubId: number;
  userName: string;
  avatarUrl: string;
  organizationId: string;
}
export interface IRepo {
  id: number;
  _id: number;
  githubId: string;
  name: string;
  topics: string;
}

export const searchedDataFormator = async (data: any) => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source.body,
    }));
  }
  return [];
};
export const formatUserDataResponse = (data: IformatUserDataResponse) => ({
  id: data._id,
  githubId: data.id,
  userName: data.userName,
  avatarUrl: data.avatarUrl,
  organizationId: data.organizationId,
});

export const formatRepoDataResponse = (data: Array<IRepo>) =>
  data.map((repo: IRepo) => ({
    id: repo._id,
    githubId: repo.id,
    name: repo.name,
    topics: repo.topics,
  }));
