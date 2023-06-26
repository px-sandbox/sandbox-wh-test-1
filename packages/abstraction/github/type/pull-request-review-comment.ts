export interface PullRequestReviewComment {
  id: string;
  body: {
    id: string;
    githubPullRequestReviewCommentId: number;
    pullRequestReviewId: number;
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
  };
}
