export type PullRequest = {
  id: number;
  number: number;
  state: string;
  title: string;
  user: {
    login: string;
  };
  body: string;
  requested_reviewers: [
    {
      login: string;
    }
  ];
  labels: [
    {
      name: string;
    }
  ];
  created_at: string;
  updated_at: string;
  closed_at: string;
  merged_at: string;
  head: {
    label: string;
    ref: string;
    repo: { id: number };
  };
  base: {
    label: string;
    ref: string;
    repo: { id: number };
  };
  merged_by: {
    login: string;
  };
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  merged: boolean;
  action?: string;
};
