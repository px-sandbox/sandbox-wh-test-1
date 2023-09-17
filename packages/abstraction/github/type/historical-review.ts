export type CommentState = {
  state: string;
  submitted_at: string;
};

export type MessageBody = {
  merged_at: string;
  approved_at: string;
  head: {
    repo: {
      owner: {
        login: string;
      };
      name: string;
      id: string;
    };
  };
  number: number;
};
