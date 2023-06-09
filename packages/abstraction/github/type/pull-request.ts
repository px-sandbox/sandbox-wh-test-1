export interface PullRequest {
  id: string;
  body: {
    id: string;
    githubPullId: number;
    number?: number;
    state?: string;
    title?: string;
    pullRequestCreatedBy?: string;
    body?: string;
    createdAt?: string;
    updatedAt?: string;
    closedAt?: string;
    mergedAt?: string;
    requestedReviewers?: requestedReviewers[];
    labels?: labels[];
    head?: {
      label: string;
      ref: string;
    };
    base?: {
      label: string;
      ref: string;
    };
    mergedBy?: string;
    comments?: number;
    reviewComments?: number;
    commits?: number;
    additions?: number;
    deletions?: number;
    changedFiles?: number;
    repoId?: string;
    organizationId?: string;
  };
}

export type requestedReviewers = {
  login: string;
};

export type labels = {
  name: string;
};
