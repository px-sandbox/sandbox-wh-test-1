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
  // TODO: For some cases max_score was null but values was gt 0
  // if (data?.hits?.max_score != null) {
  //   return data.hits.hits.map((hit: Other.Type.Hit) => ({
  //     _id: hit._id,
  //     ...hit._source.body,
  //   }));
  // }

  if (data?.hits?.total?.value > 0) {
    return data.hits.hits
      .filter(
        (hit: Other.Type.Hit) =>
          typeof hit._source.body.isDeleted === 'undefined' || hit._source.body.isDeleted === false
      )
      .map((hit: Other.Type.Hit) => ({
        _id: hit._id,
        ...hit._source.body,
      }));
  }
  return [];
};

export const searchedDataFormatorWithDeleted = async (data: any): Promise<any> => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits
      .map((hit: Other.Type.Hit) => ({
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

export interface Sprint {
  id: number;
  name: string;
  state: SprintState;
  startDate: string;
  endDate: string;
  completeDate: string;
  originBoardId: number;
}

export interface IssueReponse extends Sprint {
  totalIssues?: number;
  ftpRate?: number;
  totalDoc?: number;
  reopenRate?: number;
}
export interface IBoard {
  id: number;
  _id: number;
  name: string;
  createdAt: string;
  sprints: Sprint[];
}
export const formatBoardResponse = (
  data: Array<IBoard>
): Array<{
  id: number;
  jiraId: number;
  name: string;
  createdAt: string;
  sprints: Array<{
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  }>
}> => data.map((board: IBoard) => ({
  id: board._id,
  jiraId: board.id,
  name: board.name,
  createdAt: board.createdAt,
  sprints: board.sprints.map((sprint: Sprint) => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  })),
}));