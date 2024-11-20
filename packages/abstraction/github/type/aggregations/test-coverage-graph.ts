export type TestCoverageLatestDoc = {
  key: number;
  latest_document: {
    hits: {
      hits: [
        {
          _source: {
            body: {
              lines: {
                pct: string;
              };
            };
          };
        }
      ];
    };
  };
};
export type TestCoverageGraphAgg = {
  commentsPerDay: {
    buckets: [
      {
        key_as_string: string;
        by_repo: {
          buckets: [TestCoverageLatestDoc];
        };
      }
    ];
  };
};
