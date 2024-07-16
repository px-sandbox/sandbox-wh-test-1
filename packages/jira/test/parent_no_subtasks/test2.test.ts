import { toMilliseconds } from '../milliseconds_converter';
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
    name: 'Create Task',
    action: format(getIssueCreate(getTimestamp('2024-05-20T02:00:00.000Z'))),
    expect: {
      development: {
        coding: toMilliseconds(0),
        pickup: toMilliseconds(0),
        review: toMilliseconds(0),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.To_Do, Status.In_Progress, getTimestamp('2024-05-20T02:05:00.000Z'))
    ),
    expect: {
      development: {
        coding: toMilliseconds(0),
        pickup: toMilliseconds(0),
        review: toMilliseconds(0),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T02:55:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(50),
        pickup: toMilliseconds(0),
        review: toMilliseconds(0),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T03:10:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(50),
        pickup: toMilliseconds(15),
        review: toMilliseconds(0),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.Code_Review, Status.In_Progress, getTimestamp('2024-05-20T03:15:00.000Z'))
    ),
    expect: {
      development: {
        coding: toMilliseconds(50),
        pickup: toMilliseconds(15),
        review: toMilliseconds(5),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T03:20:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(55),
        pickup: toMilliseconds(15),
        review: toMilliseconds(5),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T03:25:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(55),
        pickup: toMilliseconds(20),
        review: toMilliseconds(5),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.Code_Review, Status.In_Progress, getTimestamp('2024-05-20T03:30:00.000Z'))
    ),
    expect: {
      development: {
        coding: toMilliseconds(55),
        pickup: toMilliseconds(20),
        review: toMilliseconds(10),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T03:45:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(20),
        review: toMilliseconds(10),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T03:50:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(25),
        review: toMilliseconds(10),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:50:00.000Z'),
          status: 'Code_Review',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Dev_Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T04:00:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(25),
        review: toMilliseconds(20),
        handover: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:00:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Ready_For_QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T04:30:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(25),
        review: toMilliseconds(20),
        handover: toMilliseconds(30),
        total: toMilliseconds(145),
      },
      qa: {
        pickup: toMilliseconds(0),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'Ready_For_QA',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'QA_In_Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T04:35:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(25),
        review: toMilliseconds(20),
        handover: toMilliseconds(30),
        total: toMilliseconds(145),
      },
      qa: {
        pickup: toMilliseconds(5),
        testing: toMilliseconds(0),
        total: toMilliseconds(0),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:35:00.000Z'),
          status: 'QA_In_Progress',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'QA_Pass_Deploy',
    action: format(
      getChangelog(
        Status.QA_In_Progress,
        Status.QA_Pass_Deploy,
        getTimestamp('2024-05-20T05:00:00.000Z')
      )
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(25),
        review: toMilliseconds(20),
        handover: toMilliseconds(30),
        total: toMilliseconds(145),
      },
      qa: {
        pickup: toMilliseconds(5),
        testing: toMilliseconds(25),
        total: toMilliseconds(30),
      },
      deployment: {
        total: toMilliseconds(0),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  {
    name: 'Done',
    action: format(
      getChangelog(Status.QA_Pass_Deploy, Status.Done, getTimestamp('2024-05-20T05:55:00.000Z'))
    ),
    expect: {
      development: {
        coding: toMilliseconds(70),
        pickup: toMilliseconds(25),
        review: toMilliseconds(20),
        handover: toMilliseconds(30),
        total: toMilliseconds(145),
      },
      qa: {
        pickup: toMilliseconds(5),
        testing: toMilliseconds(25),
        total: toMilliseconds(30),
      },
      deployment: {
        total: toMilliseconds(55),
      },
      history: [
        {
          eventTime: getTimestamp('2024-05-20T02:05:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T02:55:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:10:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:15:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:20:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:25:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:30:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:45:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T03:50:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T04:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:00:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
        {
          eventTime: getTimestamp('2024-05-20T05:55:00.000Z'),
          status: 'Done',
        },
      ],
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
];

describe('Case 2', () => {
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
      const { id, deletedAt, isDeleted, ...obj } = s.toJSON().body;
      expect(obj).toStrictEqual(operations[i].expect);
    });
  }
});
