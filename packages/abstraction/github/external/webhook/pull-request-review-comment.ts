export type PRReviewComment = {
  pull_request_review_id: number;
  id: number;
  diff_hunk: string;
  path: string;
  commit_id: string;
  original_commit_id: string;
  user: {
    id: number;
    type: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  reactions: {
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  action: string;
};
