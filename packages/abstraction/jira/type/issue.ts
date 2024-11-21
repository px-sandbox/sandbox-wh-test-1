import { ChangelogItem } from '../external/webhook';
import { retryProcess } from './retry-process';

export type Issue = retryProcess & {
  id: string;
  body: {
    id: string;
    issueId: string;
    issueKey: string;
    projectId: string;
    projectKey: string;
    isFTP: boolean;
    isFTF: boolean;
    issueType: string;
    isPrimary: boolean;
    priority: string;
    label: Array<string>;
    issueLinks: Array<string>;
    assigneeId: string | null;
    reporterId: string | null;
    creatorId: string | null;
    status: string;
    summary: string;
    subtasks: Array<{
      id: string;
      key: string;
      self: string;
      fields: { summary: string; status: string; issuetype: string; priority: string };
    }>;
    createdDate: string;
    lastViewed: string;
    lastUpdated: string;
    sprintId: string | null;
    boardId: string | null;
    isDeleted?: boolean | null;
    deletedAt?: string | null;
    organizationId: string;
    timeTracker: {
      estimate: number;
      actual: number;
    };
  };
};

// estimates vs actuals breakdown view api

type SubtaskArray = {
  id: string;
  estimate: number;
  actual: number;
  variance: number;
  link: string;
  title: string;
};
export type EstimatesVsActualsBreakdownResponse = SubtaskArray & {
  overallEstimate: number;
  overallActual: number;
  overallVariance: number;
  hasSubtasks: boolean;
  subtasks: SubtaskArray[];
};
