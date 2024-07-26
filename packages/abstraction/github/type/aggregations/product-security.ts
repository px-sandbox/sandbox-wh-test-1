export type ErrorsOverTimeBuckets = {
  key_as_string: string;
  key: number;
  doc_count: number;
  totalErrorCount: {
    value: number;
  };
};

export type ProdSecurityAgg = {
  errorsOverTime: {
    buckets: ErrorsOverTimeBuckets[];
  };
};
