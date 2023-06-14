export interface PullRequest {
  id: string;
  body: {
    id: string;
    githubPullId: number;
    pullNumber: number;
    state: string;
    title: string;
    pullRequestCreatedBy: string;
    pullBody: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string;
    mergedAt: string;
    requestedReviewers: RequestedReviewers[];
    labels: Labels[];
    head: {
      label: string;
      ref: string;
    };
    base: {
      label: string;
      ref: string;
    };
    mergedBy: { login: string } | null;
    comments: number;
    reviewComments: number;
    commits: number;
    additions: number;
    deletions: number;
    changedFiles: number;
    repoId: string;
    organizationId: string;
  };
}

export type RequestedReviewers = {
  login: string;
};

export type Labels = {
  name: string;
};
