import { actions } from './actions';

type retryProcess = {
  processId?: string;
}
export type PRReview = retryProcess & {
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
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
  };
}
