export type User = {
  action: string;
  membership: {
    state: string;
    role: string;
    user: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
      site_admin: boolean;
    };
  };
  organization: object;
  sender: object;
  installation: object;
};
