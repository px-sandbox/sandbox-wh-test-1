import { actions } from './actions';
import { retryProcess } from './retry-process';

export type PRReviewComment = retryProcess & {
  id: string;
  body: {
    id: string;
    githubPRReviewCommentId: number;
    pRReviewId: number;
    diffHunk: string;
    path: string;
    commitId: string;
    commentedBy: string;
    commentBody: string;
    createdAt: string;
    updatedAt: string;
    reactions: {
      totalCount: number;
      '+1': number;
      '-1': number;
      laugh: number;
      hooray: number;
      confused: number;
      heart: number;
      rocket: number;
      eyes: number;
    };
    pullId: string;
    repoId: string;
    organizationId: string;
    action: actions;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
  };
}
