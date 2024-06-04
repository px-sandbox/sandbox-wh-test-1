export type ChangelogItem = {
  field: string;
  fieldId: string;
  fieldtype: string;
  from: string;
  fromString: string;
  to: string;
  toString: string;
};

export type Issue = {
  issue: {
    id: string;
    self: string;
    key: string;
    fields: {
      customfield_10007: [
        {
          boardId: number;
          endDate: string;
          goal: '';
          id: number;
          name: string;
          startDate: string;
          state: string;
        }
      ];
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
      };
      created: string;
      priority: {
        self: string;
        name: string;
        id: string;
      };
      labels: Array<string>;
      timeestimate: number;
      issuelinks: [];
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
