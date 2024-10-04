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
