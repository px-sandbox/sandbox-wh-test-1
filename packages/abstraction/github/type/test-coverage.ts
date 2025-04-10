export type Coverage = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};
export type TestCoverage = {
  coverage: {
    total: {
      lines: Coverage;
      statements: Coverage;
      functions: Coverage;
      branches: Coverage;
    };
  };
};
export type TestCoverageData = {
  id: string;
  body: {
    id: string;
    organisationId: string;
    repoId: string;
    createdAt: string;
    forDate: string;
    statements: Coverage;
    branches: Coverage;
    functions: Coverage;
    lines: Coverage;
  };
};
export type TestCoverageResponse = {
  _id: string;
  id: string;
  organisationId: string;
  repoId: string;
  createdAt: string;
  forDate: string;
  statements: Coverage;
  branches: Coverage;
  functions: Coverage;
  lines: Coverage;
};

export type CoverageHeadline = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

export type TestCoverageHeadlineResponseDTO = {
  _id: string;
  id: string;
  organizationId: string;
  repoId: string;
  createdAt: string;
  forDate: string;
  lines: CoverageHeadline;
  statements: CoverageHeadline;
  functions: CoverageHeadline;
  branches: CoverageHeadline;
};

export type TestCoverageHeadlineResponse = {
  value: number;
};

export type TestCoverageHeadline = {
  by_repoId: {
    buckets: {
      key: string;
      latest_createdAt: {
        hits: {
          hits: {
            _source: TestCoverageData;
          }[];
        };
      };
    }[];
  };
};
