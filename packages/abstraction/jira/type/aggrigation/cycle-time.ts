export interface CycleTimeAggregationResult {
  sprints: {
    buckets: Array<{
      total_development: { value: number };
      total_qa: { value: number };
      total_deployment: { value: number };
      doc_count: number;
    }>;
  };
}
