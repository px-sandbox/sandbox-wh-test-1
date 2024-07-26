type retryProcess = {
  processId?: string;
};

export type RepoSastErrors = retryProcess & {
  _id: string;
  body: {
    errorMsg: string;
    ruleId: string;
    repoId: string;
    organizationId: string;
    fileName: string;
    lineNumber: number;
    codeSnippet: string;
    metadata: Array<{
      branch: string;
      firstReportedOn: string;
      lastReportedOn: string;
      isResolved: boolean;
    }>;
  };
};

export type RepoSastErrorCount = retryProcess & {
  id: string;
  body: {
    count: number;
    branch: string;
    repoId: string;
    organizationId: string;
    date: string;
  };
};

export type SastCompositeKeys =
  | 'errorMsg'
  | 'ruleId'
  | 'repoId'
  | 'fileName'
  | 'lineNumber'
  | 'codeSnippet'
  | 'organizationId';
