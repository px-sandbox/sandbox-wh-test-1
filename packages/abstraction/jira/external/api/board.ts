import { BoardType } from '../../enums/board-type';

export type Board = {
  id: string;
  self: string;
  name: string;
  type: BoardType;
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
