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

export type Hit = {
  _id: string;
  _source: {
    body: {
      isDeleted?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const searchedDataFormator = async (data: any): Promise<any> => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits.map((hit: Hit) => ({
      _id: hit._id,
      ...hit._source.body,
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
): Array<{ id: number; githubId: number; name: string; topics: string }> =>
  data.map((repo: IRepo) => ({
    id: repo._id,
    githubId: repo.id,
    name: repo.name,
    topics: repo.topics,
  }));

export interface IProject {
  id: number;
  _id: number;
  key: string;
  name: string;
  lead: {
    displayName: string;
    [key: string]: unknown;
  };
}

/**
 * Formats the response of an array of IProject objects into an array of objects with specific properties.
 * @param data An array of IProject objects.
 * @returns An array of objects with properties id, jiraId, name, key, and lead.
 */
export const formatProjectsResponse = (
  data: Array<IProject>
): Array<{
  id: number;
  jiraId: number;
  name: string;
  key: string;
  lead: string;
}> =>
  data.map((project: IProject) => ({
    id: project._id,
    jiraId: project.id,
    name: project.name,
    key: project.key,
    lead: project.lead.displayName,
  }));
