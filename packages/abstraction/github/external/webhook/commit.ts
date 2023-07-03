export type Commits = {
  id: string;
  timestamp: string;
  url?: string;
};

export type Commit = {
  ref: string;
  after: string;
  repository: {
    id: string;
    name: string;
    owner: {
      name: string;
      id?: string;
    };
  };
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    login: string;
  };
  commits: Commits[];
  action: string;
};
