export type ChangelogItem = {
  field: string;
  fieldId: string;
  fieldtype: string;
  from: string;
  fromString: string;
  to: string;
  toString: string;
};
export type Sprint = {
  boardId: number;
  endDate: string;
  goal: '';
  id: number;
  name: string;
  startDate: string;
  state: string;
};
export type IssueLinks = {
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
export type Issue = {
  id: string;
  self: string;
  key: string;
  fields: {
    customfield_11225: {
      id: string;
      name: string;
    };
    customfield_11226: {
      id: string;
      name: string;
    };
    customfield_10007: Array<Sprint>;
    issuetype: {
      self: string;
      id: string;
      description: string;
      name: string;
      subtask: boolean;
      avatarId: number;
      entityId: string;
      heirarchyLevel: number;
    };
    timespent: number;
    parent: {
      fields: {
        issuetype: {
          avatarId: number;
          description: string;
          hierarchyLevel: number;
          iconUrl: string;
          id: string;
          name: string;
          self: string;
          subtask: false;
        };
        priority: {
          iconUrl: string;
          id: string;
          name: string;
          self: string;
        };
        status: {
          description: string;
          iconUrl: string;
          id: string;
          name: string;
          self: string;
          statusCategory: {
            id: string;
            key: string;
            name: string;
            self: string;
          };
        };
        summary: string;
      };
      id: string;
      key: string;
      self: string;
    };
    project: {
      self: string;
      id: string;
      key: string;
      name: string;
      projectTypeKey: string;
    };
    created: string;
    priority: {
      self: string;
      name: string;
      id: string;
    };
    labels: Array<string>;
    timeestimate: number;
    issuelinks: Array<IssueLinks>;
    assignee: {
      self: string;
      accountId: string;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    updated: string;
    status: {
      self: string;
      description: string;
      name: string;
      id: string;
    };
    timeoriginalestimate: number;
    creator: {
      self: string;
      accountId: string;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    subtasks: [];
    reporter: {
      self: string;
      accountId: string;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    lastViewed: string;
    summary: string;
    timestamp: string;
  };
  changelog: {
    id: string;
    items: ChangelogItem[];
  };
  isDeleted?: boolean;
  deletedAt?: string;
  organization: string;
  eventName: string;
  timestamp: string;
};

export type IssueUpdate = {
  id: string;
  self: string;
  key: string;
  fields: {
    issuetype: {
      self: string;
      id: string;
      description: string;
      name: string;
      subtask: boolean;
      avatarId: number;
      entityId: string;
      heirarchyLevel: number;
    };
    project: {
      self: string;
      id: string;
      key: string;
      name: string;
      projectTypeKey: string;
    };
  };
  changelog: {
    id: string;
    items: ChangelogItem[];
  };
};
