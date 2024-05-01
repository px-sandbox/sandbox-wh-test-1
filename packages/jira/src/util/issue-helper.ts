import { Other } from 'abstraction';

/**
 * Creates an issue object based on the provided issue data.
 * @param issueData - The data used to create the issue.
 * @returns The created issue object.
 */
export function formatIssue(issueData: Other.Type.HitBody): any {
  return {
    id: issueData.issueId,
    key: issueData.issueKey,
    fields: {
      project: {
        id: issueData.projectId.replace(/jira_project_/g, ''),
        key: issueData.projectKey,
      },
      labels: issueData.label,
      summary: issueData.summary,
      issuetype: {
        name: issueData.issueType,
      },
      priority: {
        name: issueData.priority,
      },
      issueLinks: issueData.issuelinks,
      assignee: issueData.assigneeId
        ? {
            accountId: issueData.assigneeId.replace(/jira_user_/g, ''),
          }
        : null,
      reporter: issueData.reporterId
        ? {
            accountId: issueData.reporterId.replace(/jira_user_/g, ''),
          }
        : null,
      creator: issueData.creatorId
        ? {
            accountId: issueData.creatorId.replace(/jira_user_/g, ''),
          }
        : null,
      status: {
        name: issueData.status,
      },
      subtasks: issueData.subtasks,
      created: issueData.createdDate,
      updated: issueData.lastUpdated,
      lastViewed: issueData.lastViewed,
      isDeleted: issueData.isDeleted,
      deletedAt: issueData.deletedAt,
    },
  };
}
