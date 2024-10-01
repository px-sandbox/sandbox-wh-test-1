export type TestCoverage = {
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
