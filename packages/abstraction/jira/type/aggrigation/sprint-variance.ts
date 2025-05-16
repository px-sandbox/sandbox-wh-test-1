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
  variance: number;
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
