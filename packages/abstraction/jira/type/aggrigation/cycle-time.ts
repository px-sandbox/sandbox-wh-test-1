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

export interface SprintLevelSummaryResult {
  sprints: {
    buckets: Array<{
      key: string;
      total_development_coding: { value: number };
      total_development_pickup: { value: number };
      total_development_handover: { value: number };
      total_development_review: { value: number };
      total_development_total: { value: number };
      total_qa_pickup: { value: number };
      total_qa_testing: { value: number };
      total_qa_handover: { value: number };
      total_qa_total: { value: number };
      total_deployment_total: { value: number };
      doc_count: number;
    }>;
  };
}
