import { actions } from './actions';

export interface PRReview {
  id: string;
  body: {
    id: string;
    githubPRReviewId: number;
    commitId: string;
    reviewedBy: string;
    reviewBody: string;
    submittedAt: string;
    state: string;
    pullId: string;
    repoId: string;
    organizationId: string;
    action: actions;
  };
}
