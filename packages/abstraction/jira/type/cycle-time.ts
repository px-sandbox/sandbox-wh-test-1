import { Subtasks } from '../external/api';
import { retryProcess } from './retry-process';

export type CycleTime = retryProcess & {
  id: string;
  body: {
    id: string;
    issueId: string;
    issueKey: string;
    projectId: string;
    projectKey: string;
    organizationId: string;
    title: string;
    sprintId: string;
    issueType: string;
    development: {
      coding: number;
      pickup: number;
      review: number;
      handover: number;
      total: number;
    };
    qa: {
      pickup: number;
      testing: number;
      total: number;
    };
    deployment: {
      total: number;
    };
    assignees: {
      assigneeId: string;
      name: string;
    }[];
    subtasks: Subtasks[];
    history: {
      status: string;
      eventTime: string;
    }[];
  };
};

export type FormatCycleTime = {
  issueId: string;
  sprintId: string;
  subtasks: Subtasks[];
  organizationId: string;
  issueType: string;
  projectId: string;
  projectKey: string;
  assignee: {
    assigneeId: string;
    name: string;
  };
  title: string;
  issueKey: string;
  changelog: {
    id: string;
    items: {
      field: string;
      from: string;
      fromString: string;
      to: string;
      toString: string;
    }[];
    timestamp: string;
    issuetype: string;
    issueId: string;
  };
};

export type MainTicket = {
  issueId: string;
  issueKey: string;
  title: string;
  sprintId: string;
  organizationId: string;
  projectId: string;
  projectKey: string;
  issueType: string;
  assignees?: {
    assigneeId: string;
    name: string;
  }[];
  history?: {
    status: string;
    eventTime: string;
  }[];
  development?: {
    coding: number;
    pickup: number;
    review: number;
    handover: number;
    total: number;
  };
  qa?: {
    pickup: number;
    testing: number;
    total: number;
  };
  deployment?: {
    total: number;
  };
  subtasks: Subtasks[];
};

export type SubTicket = {
  issueId: string;
  issueKey: string;
  title: string;
  development: {
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

export type CycleTimeSummary = {
  sprintName: string;
  startDate: string;
  endDate: string;
  status: string;
  sprintId: string;
  development: {
    coding: number;
    pickup: number;
    handover: number;
    review: number;
    total: number;
  };
  qa: {
    pickup: number;
    testing: number;
    handover: number;
    total: number;
  };
  deployment: {
    total: number;
  };
  overall: number;
  overallWithoutDeployment: number;
};

export type CycleTimeOverallSummary = {
  development: {
    coding: number;
    pickup: number;
    handover: number;
    review: number;
    total: number;
  };
  qa: {
    pickup: number;
    testing: number;
    handover: number;
    total: number;
  };
  deployment: {
    total: number;
  };
};

export type CycleTimeDetailedType = {
  id: string;
  issueKey: string;
  title: string;
  assignees: {
    id: string;
    name: string;
    email: string;
  }[];
  development: unknown;
  deployment: unknown;
  qa: unknown;
  link: string;
};
