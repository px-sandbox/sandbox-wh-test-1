export type Board = {
  id: string;
  body: {
    id: string;
    boardId: number;
    self: string;
    name: string;
    type: string;
    location: {
      projectId: number;
      displayName: string;
      projectName: string;
      projectKey: string;
      projectTypeKey: string;
      avatarURI: string;
      name: string;
    };
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
