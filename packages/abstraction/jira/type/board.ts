import { BoardType } from '../enums/board-type';

type retryProcess = {
  processId?: string;
};

export type Board = retryProcess & {
  id: string;
  body: {
    id: string;
    boardId: number;
    self: string;
    name: string;
    type?: BoardType;
    projectKey: string;
    projectId: string;
    filter?: {
      id: string;
      self: string;
    } | null;
    columnConfig?: {
      columns: {
        name: string;
        statuses: {
          id: string;
          self: string;
        }[];
      }[];
      constraintType: string;
    } | null;
    ranking?: {
      rankCustomFieldId: number;
    } | null;
    organizationId: string;
    createdAt: string;
    isDeleted: boolean;
    deletedAt: string | null;
  };
};
