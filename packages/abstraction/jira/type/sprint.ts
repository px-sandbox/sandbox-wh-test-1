export type Sprint = {
  id: string;
  body: {
    id: string;
    sprintId: string;
    projectId: string;
    self: string;
    state: string;
    name: string;
    createdDate: string;
    startDate: string;
    endDate: string;
    completeDate: string;
    originBoardId: string;
    organizationId: string;
    isDeleted: boolean;
    deletedAt: string;
  };
};

export type OldSprint = {
  id: string;
  self: string;
  state: string;
  name: string;
  createdDate: string;
  originBoardId: number;
};
