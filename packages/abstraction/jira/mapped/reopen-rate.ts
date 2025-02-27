export type ReopenRateIssue = {
  _id?: string;
  id: string;
  self: string;
  key: string;
  issueId: string;
  projectKey: string;
  isDeleted?: boolean;
  deletedAt?: string;
  organization: string;
  organizationId: string;
  reOpenCount?: number;
  isReopen?: boolean;
  sprintId: string;
  boardId: string;
};
