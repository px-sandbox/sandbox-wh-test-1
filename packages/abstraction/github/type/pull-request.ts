import { actions } from './actions';
import { retryProcess } from './retry-process';

export type RequestedReviewers = {
  userId: string;
};

export type Labels = {
  name: string;
};

export type ExternalPullRequest = {
  id: number;
  number: number;
  state: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
  merged_at: string | null;
  draft: boolean;
  merged: boolean;
  merge_commit_sha: string | null;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  user: {
    id: number;
  };
  head: {
    label: string;
    ref: string;
    repo: {
      id: number;
      name: string;
      owner: {
        id: number;
        login: string;
      };
    };
  };
  base: {
    label: string;
    ref: string;
  };
  merged_by: {
    id: number;
  } | null;
  requested_reviewers: Array<{
    id: number;
  }>;
  labels: Array<{
    name: string;
  }>;
  action?: string;
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
  requestedReviewers?: RequestedReviewers[];
  labels?: Labels[];
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
  isDraft: boolean;
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
  createdAtDay: string;
  computationalDate: string;
};

export type PullRequest = retryProcess & {
  id: string;
  body: PullRequestBody;
};
