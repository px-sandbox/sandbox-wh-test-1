export type Worklog = {
  id: string; // Corresponds to "id" (string type)
  created: string; // Corresponds to "createdAt" (date type, ISO 8601 format)
  date: string; // Corresponds to "date" (date type, ISO 8601 format)
  isDeleted: boolean; // Corresponds to "isDeleted" (boolean type)
  deletedAt: string;
  organization: string; // Corresponds to "organization" (keyword type)
  eventName: string;
  projectKey: string;
  issueKey: string;
  issueId: string;
  worklog: {
    id: string;
    issueId: string;
    started: string;
    timeSpent: string;
    comment: string;
    author: {
      accountId: string;
      accontType: string;
      displayName: string;
      active: boolean;
      timeZone: string;
    };
    created: string;
    timeSpentSeconds: number;
  };
  createdDate: string;
  issueData: {
    _id: string;
    id: string;
    issueId: string;
    projectKey: string;
    projectId: string;
    issueKey: string;
    issueType: string;
    isDeleted: boolean;
    sprintId: string;
  };
};
