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

export const searchedDataFormator = async (data: any): Promise<Array<any>> => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits
      .filter(
        (hit: any) =>
          typeof hit._source.body.isDeleted === 'undefined' || hit._source.body.isDeleted === false
      )
      .map((hit: any) => ({
        _id: hit._id,
        ...hit._source.body,
      }));
  }
  return [];
};

export const formatUserDataResponse = (data: IformatUserDataResponse): { [key: string]: any } => ({
  id: data._id,
  githubId: data.id,
  userName: data.userName,
  avatarUrl: data.avatarUrl,
  organizationId: data.organizationId,
});

export const formatRepoDataResponse = (
  data: Array<IRepo>
): Array<{ id: number; githubId: number; name: string; topics: string }> =>
  data.map((repo: IRepo) => ({
    id: repo._id,
    githubId: repo.id,
    name: repo.name,
    topics: repo.topics,
  }));
