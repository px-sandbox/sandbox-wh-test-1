export type Project = {
  expand: string;
  self: string;
  id: string;
  key: string;
  description: string;
  lead: {
    self: string;
    accountId: string;
    avatarUrls: {
      '48x48': string;
      '24x24': string;
      '16x16': string;
      '32x32': string;
    };
    displayName: string;
    active: boolean;
    timeZone: string;
    accountType: string;
  };
  components: Array<{
    self: string;
    id: string;
    name: string;
    isAssigneeTypeValid: boolean;
  }>;
  issueTypes: Array<{
    self: string;
    id: string;
    description: string;
    iconUrl: string;
    name: string;
    subtask: boolean;
    avatarId: number;
    hierarchyLevel: number;
  }>;
  assigneeType: string;
  versions: Array<{
    self: string;
    id: string;
    name: string;
    archived: boolean;
    released: boolean;
    projectId: number;
  }>;
  name: string;
  roles: {
    'atlassian-addons-project-access': string;
    'Service Desk Team': string;
    Developers: string;
    'Service Desk Customers': string;
    Administrators: string;
    Users: string;
    Client: string;
    'Tempo Project Managers': string;
  };
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  properties: object;
};
