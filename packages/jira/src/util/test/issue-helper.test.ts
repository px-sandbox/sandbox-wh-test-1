import{describe,it,expect} from 'vitest'
import { formatIssue } from "../issue-helper";

describe('formatIssue', () => {
  it('should format the issue data correctly', () => {
    const issueData = {
      issueId: '123',
      issueKey: 'PROJ-456',
      projectId: 'jira_project_789',
      projectKey: 'PROJ',
      label: ['bug', 'urgent'],
      summary: 'This is a test issue',
      issueType: 'Task',
      priority: 'High',
      issuelinks: [],
      assigneeId: 'jira_user_101',
      reporterId: 'jira_user_102',
      creatorId: 'jira_user_103',
      status: 'In Progress',
      subtasks: [],
      createdDate: '2023-09-25T12:00:00Z',
      lastUpdated: '2023-09-26T12:00:00Z',
      lastViewed: '2023-09-27T12:00:00Z',
      isDeleted: false,
      deletedAt: null,
    };

    const expectedOutput = {
      id: '123',
      key: 'PROJ-456',
      fields: {
        project: {
          id: '789',
          key: 'PROJ',
        },
        labels: ['bug', 'urgent'],
        summary: 'This is a test issue',
        issuetype: {
          name: 'Task',
        },
        priority: {
          name: 'High',
        },
        issueLinks: [],
        assignee: {
          accountId: '101',
        },
        reporter: {
          accountId: '102',
        },
        creator: {
          accountId: '103',
        },
        status: {
          name: 'In Progress',
        },
        subtasks: [],
        created: '2023-09-25T12:00:00Z',
        updated: '2023-09-26T12:00:00Z',
        lastViewed: '2023-09-27T12:00:00Z',
        isDeleted: false,
        deletedAt: null,
      },
    };

    const result = formatIssue(issueData);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle missing optional fields', () => {
    const issueData = {
      issueId: '123',
      issueKey: 'PROJ-456',
      projectId: 'jira_project_789',
      projectKey: 'PROJ',
      label: ['bug', 'urgent'],
      summary: 'This is a test issue',
      issueType: 'Task',
      priority: 'High',
      issuelinks: [],
      assigneeId: undefined,
      reporterId: undefined,
      creatorId: undefined,
      status: 'In Progress',
      subtasks: [],
      createdDate: '2023-09-25T12:00:00Z',
      lastUpdated: '2023-09-26T12:00:00Z',
      lastViewed: '2023-09-27T12:00:00Z',
      isDeleted: false,
      deletedAt: null,
    };

    const expectedOutput = {
      id: '123',
      key: 'PROJ-456',
      fields: {
        project: {
          id: '789',
          key: 'PROJ',
        },
        labels: ['bug', 'urgent'],
        summary: 'This is a test issue',
        issuetype: {
          name: 'Task',
        },
        priority: {
          name: 'High',
        },
        issueLinks: [],
        assignee: null,
        reporter: null,
        creator: null,
        status: {
          name: 'In Progress',
        },
        subtasks: [],
        created: '2023-09-25T12:00:00Z',
        updated: '2023-09-26T12:00:00Z',
        lastViewed: '2023-09-27T12:00:00Z',
        isDeleted: false,
        deletedAt: null,
      },
    };

    const result = formatIssue(issueData);
    expect(result).toEqual(expectedOutput);
  });
});