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
    sprintId: string | null;
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
    assignees: Array<{
      assigneeId: string;
      name: string;
    }>;
    subtasks: Subtasks[];
    history: {
      status: string;
      eventTime: string;
    }[];
    isDeleted: boolean;
    deletedAt: string | null;
  };
};

export type FormatCycleTime = {
  issueId: string;
  sprintId: string | null;
  subtasks: Subtasks[];
  organizationId: string;
  issueType: string;
  projectId: string;
  projectKey: string;
  assignees: Array<{
    assigneeId: string;
    name: string;
  }>;
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
  assignees?: Array<{
    assigneeId: string;
    name: string;
  }>;
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
  isDeleted: boolean;
  deletedAt: string;
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
  assignees: Array<{
    assigneeId: string;
    name: string;
  }>;
  history: {
    status: string;
    eventTime: string;
  }[];
  isDeleted: boolean;
  deletedAt: string | null;
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
    total: number;
  };
  deployment: {
    total: number;
  };
};
export type rcaTableHeadline = {
  max_rca_count: {
    value: number;
    keys: string[];
  };
  global_agg: {
    total_bug_count: {
      doc_count: number;
    };
  };
};

export type rcaTableView = {
  headline: {
    value: number;
    names: string[];
  };
  tableData: {
    name: string;
    count: number;
  }[];
};

export type rcaTableResponse = {
  rcaCount: {
    buckets: {
      key: string;
      doc_count: number;
    }[];
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

export type CycleTimeSummaryResponse = {
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
    total: number;
  };
  deployment: {
    total: number;
  };
  overall: number;
  overallWithoutDeployment: number;
};
export type rcaDetailType = {
  name: string;
  highest: number;
  high: number;
  medium: number;
  low: number;
  lowest: number;
  total?: number;
};

export type rcaDetailResponse = {
  by_rca: {
    buckets: [
      {
        key: string;
        doc_count: number;
        highest_count: {
          doc_count: number;
        };
        high_count: {
          doc_count: number;
        };
        medium_count: {
          doc_count: number;
        };
        low_count: {
          doc_count: number;
        };
        lowest_count: {
          doc_count: number;
        };
      }
    ];
  };
};

export type currType = {
  key: {
    rca_name: string;
    priority: string;
  };
  doc_count: number;
  priority_count: {
    value: number;
  };
};

export type rcaTrendsResponse = {
  headline: {
    value: number;
    names: string;
  };
  trendsData: {
    sprintName?: string;
    versionName?: string;
    highest: number;
    high: number;
    medium: number;
    low: number;
    lowest: number;
  }[];
};

export type rcaTrendsFilteredResponse = {
  sprintName?: string;
  versionName?: string;
  highest: number;
  high: number;
  medium: number;
  low: number;
  lowest: number;
};

export type rcaGraphResponse = {
  hits: {
    total: {
      value: number;
    };
  };
  aggregations: {
    rcaCount: {
      buckets: {
        key: string;
        doc_count: number;
      }[];
    };
  };
};

export type rcaGraphView = {
  headline: {
    value: number;
    names: string[];
  };
  graphData: {
    name: string;
    percentage: number;
  }[];
  maximized: {
    name: string;
    percentage: number;
  }[];
};
