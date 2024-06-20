import { MainTicket } from '../../src/lib/issue/main-ticket';
import {
  getAssigneeAdded,
  getChangelog,
  getIssueCreate,
  getTimestamp,
  Status,
  format,
} from '../template';
import { StatusMapping } from '../type';
import { describe, expect, test } from 'vitest';

const operations = [
  {
    name: 'create',
    action: format(getIssueCreate(getTimestamp('2024-05-20T03:00:00.000Z'))),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      history: [],
      development: {
        coding: 0,
        pickup: 0,
        review: 0,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.To_Do, Status.In_Progress, getTimestamp('2024-05-20T03:05:00.000Z'))
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 0,
        pickup: 0,
        review: 0,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
      ],
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T03:55:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 50,
        pickup: 0,
        review: 0,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T04:10:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 50,
        pickup: 15,
        review: 0,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
      ],
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.Code_Review, Status.In_Progress, getTimestamp('2024-05-20T04:15:00.000Z'))
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 50,
        pickup: 15,
        review: 5,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
      ],
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T04:20:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 55,
        pickup: 15,
        review: 5,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T04:25:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 55,
        pickup: 20,
        review: 5,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
      ],
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.Code_Review, Status.In_Progress, getTimestamp('2024-05-20T04:30:00.000Z'))
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 55,
        pickup: 20,
        review: 10,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
      ],
    },
  },
  {
    name: 'Ready_For_Review___',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T04:45:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 20,
        review: 10,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T04:50:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 25,
        review: 10,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
      ],
    },
  },
  {
    name: 'Dev_Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T05:00:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 25,
        review: 20,
        handover: 0,
        total: 0,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
    },
  },
  {
    name: 'Ready_For_QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T05:30:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 25,
        review: 20,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
      ],
    },
  },
  {
    name: 'QA_In_Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T05:35:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 25,
        review: 20,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 5,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
      ],
    },
  },
  {
    name: 'QA_Failed',
    action: format(
      getChangelog(
        Status.QA_In_Progress,
        Status.QA_Failed,
        getTimestamp('2024-05-20T05:45:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 25,
        review: 20,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 5,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
      ],
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.QA_Failed, Status.In_Progress, getTimestamp('2024-05-20T05:55:00.000Z'))
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 70,
        pickup: 25,
        review: 20,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 5,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
      ],
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T06:15:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 25,
        review: 20,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 5,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T06:20:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 30,
        review: 20,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 5,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:20:00.000Z'),
          status: 'Code_Review',
        },
      ],
    },
  },
  {
    name: 'Dev_Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T06:30:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 30,
        review: 30,
        handover: 30,
        total: 145,
      },
      qa: {
        pickup: 5,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:20:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:30:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
    },
  },
  {
    name: 'Ready_For_QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T06:40:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 30,
        review: 30,
        handover: 40,
        total: 190,
      },
      qa: {
        pickup: 5,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:20:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:30:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:40:00.000Z'),
          status: 'Ready_For_QA',
        },
      ],
    },
  },
  {
    name: 'QA_In_Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T06:45:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 30,
        review: 30,
        handover: 40,
        total: 190,
      },
      qa: {
        pickup: 10,
        testing: 10,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:20:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:30:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:40:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:45:00.000Z'),
          status: 'QA_In_Progress',
        },
      ],
    },
  },
  {
    name: 'QA_Pass_Deploy',
    action: format(
      getChangelog(
        Status.QA_In_Progress,
        Status.QA_Pass_Deploy,
        getTimestamp('2024-05-20T07:00:00.000Z')
      )
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 30,
        review: 30,
        handover: 40,
        total: 190,
      },
      qa: {
        pickup: 10,
        testing: 25,
        total: 35,
      },
      deployment: {
        total: 0,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:20:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:30:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:40:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:45:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T07:00:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
      ],
    },
  },
  {
    name: 'Done',
    action: format(
      getChangelog(Status.QA_Pass_Deploy, Status.Done, getTimestamp('2024-05-20T07:30:00.000Z'))
    ),
    expect: {
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
      development: {
        coding: 90,
        pickup: 30,
        review: 30,
        handover: 40,
        total: 190,
      },
      qa: {
        pickup: 10,
        testing: 25,
        total: 35,
      },
      deployment: {
        total: 30,
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T03:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:45:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:15:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:20:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:30:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:40:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T06:45:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T07:00:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
        {
          eventTime: getTimestamp('2024-05-20T07:30:00.000Z'),
          status: 'Done',
        },
      ],
    },
  },
];

describe('Case 3', () => {
  for (let i = 0; i < operations.length; i++) {
    test(`Test ${i}: ${operations[i].name}`, () => {
      let s = {} as MainTicket;
      for (let j = 0; j <= i; j++) {
        if (j === 0) {
          s = new MainTicket(operations[0].action, Status, StatusMapping);
        } else {
          s.changelog(operations[j].action.changelog);
        }
      }
      expect(s.toJSON()).toStrictEqual(operations[i].expect);
    });
  }
});
