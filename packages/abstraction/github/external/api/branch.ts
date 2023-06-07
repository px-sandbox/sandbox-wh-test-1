export type Branch = {
  id: string;
  action?: string;
  name: string;
  repo_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  deleted_at?: string;
  ref: string;
};
