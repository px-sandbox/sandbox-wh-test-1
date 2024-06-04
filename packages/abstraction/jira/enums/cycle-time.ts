export enum CycleTimeSortKey {
  OVERALL = 'overall',
  OVERALL_WITHOUT_DEPLOYMENT = 'overallWithoutDeployment',
  DEVELOPMENT = 'avg_development_total',
  QA = 'avg_qa_total',
  DEPLOYMENT = 'avg_deployment_total',

  DEVELOPMENT_CODING = 'avg_development_coding',
  DEVELOPMENT_PICKUP = 'avg_development_pickup',
  DEVELOPMENT_HANDOVER = 'avg_development_handover',
  DEVELOPMENT_REVIEW = 'avg_development_review',
  QA_PICKUP = 'avg_qa_pickup',
  QA_TESTING = 'avg_qa_testing',
  QA_HANDOVER = 'avg_qa_handover',
}

export enum CycleTimeSummaryType {
  GRAPH = 'graph',
  TABLE = 'table',
}

export enum CycleTimeDetailSortKey {
  DEVELOPMENT = 'development.total',
  QA = 'qa.total',
  DEPLOYMENT = 'deployment.total',

  DEVELOPMENT_CODING = 'development.coding',
  DEVELOPMENT_PICKUP = 'development.pickup',
  DEVELOPMENT_HANDOVER = 'development.handover',
  DEVELOPMENT_REVIEW = 'development.review',
  QA_PICKUP = 'qa.pickup',
  QA_TESTING = 'qa.testing',
  QA_HANDOVER = 'qa.handover',
}
