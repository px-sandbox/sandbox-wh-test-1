import { SprintState } from 'abstraction/jira/enums';
import { Other } from 'abstraction';

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


export const searchedDataFormator = async (
  data: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[] | []> => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits.map((hit: Other.Type.Hit) => ({
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


/**
 * Formats the response of Jira projects API to a specific format.
 * @param data - An array of project objects returned by Jira projects API.
 * @returns An array of formatted project objects.
 */
export const formatProjectsResponse = (
  data: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[] | []
): Array<{
  id: string;
  jiraId: string;
  name: string;
  key: string;
  lead: string;
  organizationId: string;
}> =>
  data.map((project) => ({
    id: project._id,
    jiraId: project.id,
    name: project.name,
    key: project.key,
    lead: project.lead.displayName,
    organizationId: project.organizationId
  }));

export interface Sprint {
  id: number;
  name: string;
  state: SprintState;
  startDate: string;
  endDate: string;
  completeDate: string;
  originBoardId: number;
}

export interface IssueReponse {
  total?: number;
  totalFtp?: number;
  totalBugs?: number;
  totalReopen?: number;
  sprint?: string;
  status?: SprintState;
  start?: string;
  end?: string;
  percentValue: number;
}
