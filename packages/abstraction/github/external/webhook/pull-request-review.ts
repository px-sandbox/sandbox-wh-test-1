export type PRReview = {
  id: number;
  commit_id: string;
  user: {
    id: number;
  };
  body: string;
  submitted_at: string;
  state: string;
};
