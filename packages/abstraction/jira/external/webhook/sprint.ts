export type Sprint = {
  id: string;
  self: string;
  state: string;
  name: string;
  createdDate: string;
  endDate: string;
  startDate: string;
  completeDate: string;
  originBoardId: number;
  isDeleted: boolean;
  deletedAt: string;
  organization: string;
};
export type IssueSprint = {
  boardId: number;
  endDate: string;
  goal: '';
  id: number;
  name: string;
  startDate: string;
  state: string;
};
