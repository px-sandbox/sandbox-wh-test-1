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
  history: {
    status: string;
    eventTime: string;
  }[];
};

export type CycleTime = {
  issueId: string;
  sprintId: string;
  subtasks: Subtasks[];
  organizationId: string;
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

export enum IssuesTypes {
  STORY = 'Story',
  TASK = 'Task',
  BUG = 'Bug',
  EPIC = 'Epic',
  SUBTASK = 'Sub-task',
}

export const Status = {
  To_Do: '1',
  In_Progress: '2',
  Ready_For_Review: '3',
  Code_Review: '4',
  Dev_Complete: '5',
  Ready_For_QA: '6',
  QA_In_Progress: '7',
  QA_Failed: '8',
  QA_Pass_Deploy: '9',
  Done: '10',
  Rejected: '11',
  Blocked: '12',
};

// @ts-ignore
export const StatusMapping: Record<string, { label: string; id: number }> = {
  [Status.To_Do]: { label: 'To_Do', id: Status.To_Do },
  [Status.In_Progress]: { label: 'In_Progress', id: Status.In_Progress },
  [Status.Ready_For_Review]: {
    label: 'Ready_For_Review',
    id: Status.Ready_For_Review,
  },
  [Status.Code_Review]: { label: 'Code_Review', id: Status.Code_Review },
  [Status.Dev_Complete]: { label: 'Dev_Complete', id: Status.Dev_Complete },
  [Status.Ready_For_QA]: { label: 'Ready_For_QA', id: Status.Ready_For_QA },
  [Status.QA_In_Progress]: {
    label: 'QA_In_Progress',
    id: Status.QA_In_Progress,
  },
  [Status.QA_Failed]: { label: 'QA_Failed', id: Status.QA_Failed },
  [Status.QA_Pass_Deploy]: {
    label: 'QA_Pass_Deploy',
    id: Status.QA_Pass_Deploy,
  },
  [Status.Done]: { label: 'Done', id: Status.Done },
};
export enum ChangelogField {
  SPRINT = 'Sprint',
  STATUS = 'status',
  CUSTOM = 'custom',
  JIRA = 'jira',
  CUSTOM_FIELD = 'customfield_10007',
  ASSIGNEE = 'assignee',
}
