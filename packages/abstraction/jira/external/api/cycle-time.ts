export type Subtasks = {
  issueId: string;
  issueKey: string;
  title: string;
  development?: {
    coding: number;
    pickup: number;
    review: number;
    handover: number;
    total: number;
  };
  assignees: {
    assigneeId: string;
    name: string;
  }[];
  history?: {
    status: string;
    eventTime: string;
  }[];
  isDeleted?: boolean;
  deletedAt?: string | null;
};

export type CycleTime = {
  issueId: string;
  sprintId: string;
  subtasks: Subtasks[];
  orgId: string;
  projectId: string;
  issueKey: string;
  projectKey: string;
  title: string;
  issueType: string;
  development: {
    coding: number;
    pickup: number;
    review: number;
    handover: number;
    total: number;
  };
  qa: { pickup: number; testing: number; total: number };
  deployment: { total: number };
  assignees: {
    assigneeId: string;
    name: string;
  }[];
  history: {
    status: string;
    eventTime: string;
  }[];
};
