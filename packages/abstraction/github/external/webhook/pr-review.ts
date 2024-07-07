export type PRReview = {
  id: number;
  commit_id: string;
  user: {
    id: number;
    type: string;
  };
  body: string;
  submitted_at: string;
  state: string;
  orgId: number;
};
