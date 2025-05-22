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
  draft: boolean;
  reviewed_at: string | null;
  approved_at: string | null;
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
    repo: {
      id: number;
      name: string;
      owner: {
        id: string;
        login: string;
      };
    };
  };
  base: {
    label: string;
    ref: string;
    repo: {
      id: number;
      name: string;
      owner: {
        login: string;
      };
    };
  };
  merged_by: {
    id: number;
  } | null;
  merged: boolean;
  merge_commit_sha: string;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  action: string;
  review_seconds: number;
  review?: {
    user: {
      id: number;
      type: string;
    };
    submitted_at: string;
    state: string;
  };
};
