export type Worklog = {
  id: string; // Corresponds to "id" (string type)
  category?: string; // Corresponds to "category" (keyword type)
  createdAt: string; // Corresponds to "createdAt" (date type, ISO 8601 format)
  date: string; // Corresponds to "date" (date type, ISO 8601 format)
  isDeleted: boolean; // Corresponds to "isDeleted" (boolean type)
  deletedAt: string;
  organization: string; // Corresponds to "organization" (keyword type)
  issueId: string,
  timeLogged: number,
  startTime: string,
  eventName: string,
  projectKey: string,
  issueKey: string,
  started: string,
  timeSpentSeconds: number,
  createdDate: string,
  issueData: {
    _id: string,
    id: string,
    issueId: string,
    projectKey: string,
    projectId: string,
    issueKey: string,
    issueType: string,
    isDeleted: boolean,
  }
};
