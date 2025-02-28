export type IssueLinks = {
  destinationIssueId: string;
  sourceIssueId: string;
  id: string;
  issueLinkType: {
    id: string;
    inwardName: string;
    name: string;
    isSubTaskLinkType: boolean;
    outwardName: string;
    isSystemLinkType: boolean;
  };
  systemLink: boolean;
};

export type IssueWebhookLinks = {
  id: string;
  self: string;
  type: {
    id: string;
    name: string;
    inward: string;
    outward: string;
    self: string;
  };
  inwardIssue: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      status: {
        self: string;
        description: string;
        iconUrl: string;
        name: string;
        id: string;
      };
      priority: {
        self: string;
        iconUrl: string;
        name: string;
        id: string;
      };
      issuetype: {
        self: string;
        id: string;
        description: string;
        iconUrl: string;
        name: string;
        subtask: boolean;
        avatarId: number;
        entityId: string;
        heirarchyLevel: number;
      };
    };
  };
  outwardIssue: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      status: {
        self: string;
        description: string;
        iconUrl: string;
        name: string;
        id: string;
      };
      priority: {
        self: string;
        iconUrl: string;
        name: string;
        id: string;
      };
      issuetype: {
        self: string;
        id: string;
        description: string;
        iconUrl: string;
        name: string;
        subtask: boolean;
        avatarId: number;
        entityId: string;
        heirarchyLevel: number;
      };
    };
  };
};
