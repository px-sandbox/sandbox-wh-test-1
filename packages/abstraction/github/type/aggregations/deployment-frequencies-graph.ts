export interface DeploymentFrequencyGraph {
  commentsPerDay: {
    buckets: [
      {
        key_as_string: string;
        by_dest: {
          buckets: [
            {
              key: string;
              doc_count: number;
            }
          ];
        };
        key: number;
        doc_count: number;
      }
    ];
  };
}
