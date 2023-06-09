export type Push = {
  id: string;
  body: {
    id: string;
    githubPushId: string;
    ref: string;
    pusherId: string;
    commits: string[];
    organizationId: string;
  };
};

export type CommitIds = {
  id: string;
};
