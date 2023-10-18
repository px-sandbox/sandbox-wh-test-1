// issue api type (required fields only)
export type Issue = {
  id: string;
  key: string;
  self: string;
  fields: {
    sprint: {
      id: string;
      self: string;
      state: string;
      name: string;
      originBoardId: string;
      goal: string;
    };
    closedSprints: [{
      id: string;
      self: string;
      state: string;
      name: string;
      goal: string;
    }];
    description: string;
    project: {
      self: string;
      id: string;
      key: string;
      name: string;
    };
    timeTracking: {
      originalEstimate: string;
      remainingEstimate: string;
      timeSpent: string;
    };
  };
};
