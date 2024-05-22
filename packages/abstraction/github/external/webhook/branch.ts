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
  sender: object;
  installation: object;
  action: string;
  protected: boolean;
};
