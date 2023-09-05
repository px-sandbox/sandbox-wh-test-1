type Assignee = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
};

type AssigningTeam = {
  name: string;
  id: number;
  node_id: string;
  slug: string;
  description: string;
  privacy: string;
  notification_setting: string;
  url: string;
  html_url: string;
  members_url: string;
  repositories_url: string;
  permission: string;
  parent: null | string;
};

export type GHCopilotReport = {
  created_at: string;
  assignee: Assignee;
  updated_at: string;
  pending_cancellation_date: null | string;
  last_activity_at: string;
  last_activity_editor: string;
  assigning_team: AssigningTeam;
};
