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
      id: string;
      name: string;
      email: string;
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
    self: string;
    accountId: string;
    displayName: string;
    active: boolean;
    timeZone: string;
    accountType: string;
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
    id: string;
    name: string;
    email: string;
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
    id: string;
    name: string;
    email: string;
  }[];
  history: {
    status: string;
    eventTime: string;
  }[];
};
