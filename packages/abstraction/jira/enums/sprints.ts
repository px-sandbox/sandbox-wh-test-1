export enum State {
  FUTURE = 'future',
  ACTIVE = 'active',
  CLOSED = 'closed',
  RELEASED = 'released',
  UNRELEASED = 'unreleased',
}

export enum JiraFilterType {
  SPRINT = 'sprint',
  VERSION = 'version',
}

export type SprintMapping = {
  sprintId: string;
  status: State;
  name: string;
  startDate: string;
  endDate: string;
};

export type VersionMapping = {
  versionId: string;
  status: State;
  name: string;
  startDate: string;
  releaseDate: string;
};
