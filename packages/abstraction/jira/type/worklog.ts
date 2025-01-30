export interface Worklog {
    id: string; // Unique identifier for the worklog entry
    body: {
      category?: string | null; // Category of the worklog (keyword type)
      createdAt?: string; 
      date: string; 
      id: string; // Worklog ID (text type)
      isDeleted?: boolean; // Indicates if the worklog is deleted
      issueKey?: string; // Associated Jira issue key
      projectKey?: string; // Associated Jira project key
      timeLogged: number; // Time logged in milliseconds (long type)
      organizationId: string; // Unique identifier for the organization
    };
  }  
  