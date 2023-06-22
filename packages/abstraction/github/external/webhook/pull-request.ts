export type PullRequest = {
  id: number;
  number: number;
  state: string;
  title: string;
  user: {
    id: number;
  };
  body: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
  merged_at: string;
  requested_reviewers: [
    {
      id: number;
    }
  ];
  labels: [
    {
      name: string;
    }
  ];
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
    id: number;
  } | null;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
};
