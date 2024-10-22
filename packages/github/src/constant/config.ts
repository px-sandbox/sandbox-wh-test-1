export const mappingPrefixes = {
  user: 'gh_user',
  branch: 'gh_branch',
  organization: 'gh_org',
  repo: 'gh_repo',
  commit: 'gh_commit',
  pull: 'gh_pull',
  pRReviewComment: 'gh_pr_review_comment',
  push: 'gh_push',
  pRReview: 'gh_pr_review',
  branch_count: 'gh_branch_count',
  sast_errors: 'gh_sast_errors',
  gh_Deployment:'gh_deployment'
};
export const esbDateHistogramInterval = {
  day: 'day',
  month: 'month',
  year: 'year',
  '2d': '2d',
  '3d': '3d',
};
export enum MigrationStatus {
  COMPLETED = 'COMPLETED',
  IN_PROGRESS = 'IN_PROGRESS',
  FAILED = 'FAILED',
}
