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
      deploy: number;
      total: number;
    };
    assignees: {
      id: string;
      name: string;
      email: string;
    }[];
    hasSubtasks: boolean;
    subtasks: {
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
    };
  };
};
