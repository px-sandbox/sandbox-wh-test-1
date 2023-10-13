import { BoardType } from '../../enums/board-type';

export type Board = {
  id: number;
  self: string;
  name: string;
  type?: BoardType;
  location: {
    projectId: number;
    displayName: string;
    projectName: string;
    projectKey: string;
    projectTypeKey: string;
    avatarURI: string;
    name: string;
  };
};

export type BoardConfig = {
  id: number;
  name: string;
  self: string;
  location: {
    type: string;
    key: string;
    id: string;
    self: string;
    name: string;
  };
  filter: {
    id: string;
    self: string;
  };
  columnConfig: {
    columns: {
      name: string;
      statuses: {
        id: string;
        self: string;
      }[];
    }[];
    constraintType: string;
  };
  ranking: {
    rankCustomFieldId: number;
  };
};
