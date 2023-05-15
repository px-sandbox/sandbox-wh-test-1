export type Organization = {
  id: string;
  name: string;
  description: string;
  company: string;
  location: string;
  email: string;
  is_verified: boolean;
  has_organization_projects: boolean;
  has_repository_projects: boolean;
  public_repos: number;
  private: boolean;
  owner: { login: string };
  visibility: boolean;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};
