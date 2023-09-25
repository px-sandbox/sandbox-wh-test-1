export type Sprint = {
  id: string;
  body: {
    id: string;
    jiraSprintId: string;
    self: string;
    state: string;
    name: string;
    createdDate: string;
    startDate: string;
    endDate: string;
    originBoardId: number;
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
