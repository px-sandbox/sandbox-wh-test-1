import { IssueLinked } from '../../enums';

type sprint = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};
type version = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};
export type BucketItem = {
  key: string;
  doc_count: number;
  estimate: {
    value: number;
  };
  actual: {
    value: number;
  };
};
export type SprintVariance = {
  sprint?: sprint;
  version?: version;
  time: {
    estimate: number;
    actual: number;
  };
  workItems: {
    task: number;
    story: number;
    bug: number;
    total: number;
  };
  isAllEstimated: boolean;
  jiraInfo: {
    estimateIssueLink: string;
    loggedIssueLink: string;
  };
  bugTime: {
    value: number;
    status: IssueLinked;
    loggedBugsCount: number;
    unloggedBugsCount: number;
  };
  variance: number;
  totalTime: number;
  totalVariance?: string;
};

export type SprintVarianceData = {
  data: SprintVariance[];
  page: number;
  totalPages: number;
};

export type TaskItem = {
  issueKey: string;
  issueType: string;
  timeTracker?: {
    estimate: number;
  };
  embeddedSubtasks?: Array<{
    timeTracker?: {
      estimate: number;
    };
  }>;
  issueLinks?: Array<{
    type: string;
    key: string;
  }>;
  parent?: {
    key: string;
  };
};
