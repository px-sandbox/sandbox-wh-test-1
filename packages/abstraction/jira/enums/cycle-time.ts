export enum CycleTimeSortKey {
  OVERALL = 'overall',
  OVERALL_WITHOUT_DEPLOYMENT = 'overallWithoutDeployment',
  DEVELOPMENT = 'development',
  QA = 'qa',
  DEPLOYMENT = 'deployment',

  DEVELOPMENT_CODING = 'development.coding',
  DEVELOPMENT_PICKUP = 'development.pickup',
  DEVELOPMENT_HANDOVER = 'development.handover',
  DEVELOPMENT_REVIEW = 'development.review',
  QA_PICKUP = 'qa.pickup',
  QA_TESTING = 'qa.testing',
  QA_HANDOVER = 'qa.handover',
}

export enum CycleTimeSummaryType {
  GRAPH = 'graph',
  TABLE = 'table',
}
