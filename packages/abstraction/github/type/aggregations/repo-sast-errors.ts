export type SastErrorReport = {
  errorMsg: string;
  errorRuleId: string;
  errorFileName: string;
  errorRepoId: string;
  errorMetadata: string;
};

export type SastErrorsAggregation = {
  errorName: string;
  ruleId: string;
  filename: string;
  branch: string[];
  firstOccurredAt: string;
  repoName: string;
};
export type SastErrorsAggregationData = {
  data: SastErrorsAggregation[];
  afterKey: string | undefined;
};
export type SastErrorsData = [
  {
    _id: string;
    errorMsg: string;
    ruleId: string;
    repoId: string;
    organizationId: string;
    branch: string;
    fileName: string;
    lineNumber: number;
    codeSnippet: string;
    date: string;
    createdAt: string;
    isDeleted: boolean;
  }
];
