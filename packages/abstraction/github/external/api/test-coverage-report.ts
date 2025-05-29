type CoverageFile = {
  path: string;
  statementMap: {
    [key: string]: {
      start: {
        line: number;
        column: number | null;
      };
      end: {
        line: number;
        column: number | null;
      };
    };
  };
  fnMap: {
    [key: string]: {
      name: string;
      decl: {
        start: {
          line: number;
          column: number;
        };
        end: {
          line: number;
          column: number;
        };
      };
      loc: {
        start: {
          line: number;
          column: number;
        };
        end: {
          line: number;
          column: number;
        };
      };
    };
  };
  branchMap: {
    [key: string]: string;
  };
  s: {
    [key: string]: number;
  };
  f: {
    [key: string]: number;
  };
  b: {
    [key: string]: string;
  };
};

export type RepoCoverageData = {
  organisationId: number;
  repoId: number;
  createdAt: string;
  coverage: {
    [filePath: string]: CoverageFile;
  };
};
