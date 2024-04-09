import { actions } from './actions';

export type RequestedReviewers = {
  userId: string;
};

export type Labels = {
  name: string;
};

export type PullRequestBody = {
  id: string;
  githubPullId: number;
  pullNumber: number;
  state: string;
  title: string;
  pRCreatedBy: string;
  pullBody: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string;
  mergedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  reviewSeconds: number;
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
  mergedBy: { userId: string } | null;
  merged: boolean;
  mergedCommitId: string | null;
  comments: number;
  reviewComments: number;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  repoId: string;
  organizationId: string;
  action: actions;
  githubDate: string;
};

export interface PullRequest {
  id: string;
  body: PullRequestBody;
  processId?: string;  
}
