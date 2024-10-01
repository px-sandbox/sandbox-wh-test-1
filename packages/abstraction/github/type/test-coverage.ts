export type TestCoverage = {
  coverage: {
    total: {
      lines: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
      };
      statements: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
      };
      functions: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
      };
      branches: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
      };
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
    statements: TestCoverage['coverage']['total']['statements'];
    branches: TestCoverage['coverage']['total']['branches'];
    functions: TestCoverage['coverage']['total']['functions'];
    lines: TestCoverage['coverage']['total']['lines'];
  };
};
