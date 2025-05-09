export type Branch = {
  ref: string;
  ref_type: string;
  master_branch: string;
  description: string;
  pusher_type: string;
  repository: {
    id: string;
    pushed_at: string;
    owner: {
      id: string;
    };
  };
  organization: object;
  sender: {
    id: string;
  };
  installation: object;
  action: string;
  protected: boolean;
};
