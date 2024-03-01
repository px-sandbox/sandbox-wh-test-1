// issue api type (required fields only)
export type Issue = {
  id: string;
  key: string;
  self: string;
  fields: {
    subtasks: Array<{
      id: string;
      key: string;
      self: string;
      fields: { summary: string; status: string; issuetype: string; priority: string };
    }>;
    sprint: {
      id: string;
      self: string;
      state: string;
      name: string;
      originBoardId: string;
      goal: string;
    };
    closedSprints: [
      {
        id: string;
        self: string;
        state: string;
        name: string;
        goal: string;
      }
    ];
    description: string;
    project: {
      self: string;
      id: string;
      key: string;
      name: string;
    };
    timetracking: {
      originalEstimateSeconds: number;
      remainingEstimateSeconds: number;
      timeSpentSeconds: number;
    };
    customfield_10007: [
      {
        id: string;
        self: string;
        state: string;
        name: string;
        boardId: string;
        goal: string;
      }
    ];
    summary: string;
    parent: {
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
          statusCategory: {
            self: string;
            id: number;
            key: string;
            colorName: string;
            name: string;
          };
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
          hierarchyLevel: number;
        };
      };
    };
  };
};
