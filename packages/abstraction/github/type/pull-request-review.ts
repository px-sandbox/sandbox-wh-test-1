export interface PullRequestReview {
  id: string;
  body: {
    id: string;
    githubPullRequestReviewId: number;
    commitId: string;
    reviewedBy: string;
    reviewBody: string;
    submittedAt: string;
    state: string;
    pullId: string;
    repoId: string;
    organizationId: string;
  };
}
