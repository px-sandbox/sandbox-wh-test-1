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
      avg_development_coding: { value: number };
      avg_development_pickup: { value: number };
      avg_development_handover: { value: number };
      avg_development_review: { value: number };
      avg_development_total: { value: number };
      avg_qa_pickup: { value: number };
      avg_qa_testing: { value: number };
      avg_qa_handover: { value: number };
      avg_qa_total: { value: number };
      avg_deployment_total: { value: number };
      overall: { value: number };
      overallWithoutDeployment: { value: number };
      doc_count: number;
    }>;
  };
}
