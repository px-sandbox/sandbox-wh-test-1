import { expect } from 'vitest';
import { MainTicket } from '../../src/lib/issue/main-ticket';
import { Status, format, getChangelog, getIssueCreate, getTimestamp, issueType } from '../template';
import { StatusMapping } from '../type';
import test, { describe } from 'node:test';
import { toMilliseconds } from '../milliseconds_converter';

const operations = [
  // Create Parent Task
  {
    operator: 'create_parent',
    name: 'Create Parent Task',
    action: format(getIssueCreate(getTimestamp('2024-05-20T10:00:00.000Z'))),
    expect: {
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
  // Subtask 1 added
  {
    operator: 'add_subtask',
    name: 'Subtask 1 added',
    action: {
      issueId: '1',
      issueKey: 'PT-1',
      title: 'helo1',
      assignees: [],
      isDeleted: false,
    },
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [],
      issueType: 'Task',
    },
  },
  // Subtask 2 added
  {
    operator: 'add_subtask',
    name: 'Subtask 2 added',
    action: {
      issueId: '2',
      issueKey: 'PT-2',
      title: 'helo2',
      assignees: [],
      isDeleted: false,
    },
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [],
      issueType: 'Task',
    },
  },
  // Subtask 3 added
  {
    operator: 'add_subtask',
    name: 'Subtask 3 added',
    action: {
      issueId: '3',
      issueKey: 'PT-3',
      title: 'helo3',
      assignees: [],
      isDeleted: false,
    },
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [],
      issueType: 'Task',
    },
  },
  // Subtask 1 moved to In progress
  {
    operator: 'transition',
    name: 'Subtask 1 moved to In progress',
    action: format(
      getChangelog(
        Status.To_Do,
        Status.In_Progress,
        getTimestamp('2024-05-20T10:10:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [],
      issueType: 'Task',
    },
  },
  // Parent to inprogress
  {
    operator: 'transition',
    name: 'Parent to inprogress',
    action: format(
      getChangelog(
        Status.To_Do,
        Status.In_Progress,
        getTimestamp('2024-05-20T10:10:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 2 moved to In progress
  {
    operator: 'transition',
    name: 'Subtask 2 moved to In progress',
    action: format(
      getChangelog(
        Status.To_Do,
        Status.In_Progress,
        getTimestamp('2024-05-20T10:30:00.000Z'),
        2,
        issueType.SubTask
      )
    ).changelog,
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 1 moved to Ready for review
  {
    operator: 'transition',
    name: 'Subtask 1 moved to Ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T11:00:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 1 moved to Code review
  {
    operator: 'transition',
    name: 'Subtask 1 moved to Code review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T11:05:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 50,
        pickup: 5,
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 0,
            pickup: 5,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 2 moved to Ready for review
  {
    operator: 'transition',
    name: 'Subtask 2 moved to Ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T11:20:00.000Z'),
        2,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 5,
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 0,
            pickup: 5,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 1 moved to dev completed
  {
    operator: 'transition',
    name: 'Subtask 1 moved to dev completed',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T11:30:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 5,
        review: 25,
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 0,
            pickup: 5,
            review: 25,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 2 moved to Code review
  {
    operator: 'transition',
    name: 'Subtask 2 moved to Code review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T11:30:00.000Z'),
        2,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 25,
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
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 0,
            pickup: 5,
            review: 25,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 0,
            pickup: 10,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 1 moved to ready for qa
  {
    operator: 'transition',
    name: 'Subtask 1 moved to ready for qa',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Done,
        getTimestamp('2024-05-20T11:35:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 25,
        handover: 5,
        total: 85,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 0,
            pickup: 10,
            review: 0,

            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 2 moved to dev completed
  {
    operator: 'transition',
    name: 'Subtask 2 moved to dev completed',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T12:00:00.000Z'),
        2,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 55,
        handover: 5,
        total: 85,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 0,
            pickup: 10,
            review: 30,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 2 moved to ready for qa
  {
    operator: 'transition',
    name: 'Subtask 2 moved to ready for qa',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Done,
        getTimestamp('2024-05-20T12:30:00.000Z'),
        2,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 55,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 3  moved to in progress
  {
    operator: 'transition',
    name: 'Subtask 3  moved to in progress',
    action: format(
      getChangelog(
        Status.To_Do,
        Status.In_Progress,
        getTimestamp('2024-05-20T13:00:00.000Z'),
        3,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 55,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 0,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'), // wrong
              status: 'In_Progress',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 3 moved to ready for review
  {
    operator: 'transition',
    name: 'Subtask 3 moved to ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T13:25:00.000Z'),
        3,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 15,
        review: 55,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'), // wrong
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'), // wrong
              status: 'Ready_For_Review',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to Read for review
  {
    operator: 'transition',
    name: 'Parent to Read for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T13:25:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 15,
        review: 55,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 0,
            pickup: 0,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'), // wrong
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'), // wrong
          status: 'Ready_For_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 3 moved to code review
  {
    operator: 'transition',
    name: 'Subtask 3 moved to code review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T13:30:00.000Z'),
        3,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 55,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 0,
            pickup: 5,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'), // wrong
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'), // wrong
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'), // wrong
              status: 'Code_Review',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to Code Review
  {
    operator: 'transition',
    name: 'Parent to Code Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T13:30:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 55,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 0,
            pickup: 5,
            review: 0,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 3 moved to dev completed
  {
    operator: 'transition',
    name: 'Subtask 3 moved to dev completed',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T14:00:00.000Z'),
        3,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 0,
            pickup: 5,
            review: 30,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'), // wrong
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'), // wrong
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'), // wrong
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to Dev Complete
  {
    operator: 'transition',
    name: 'Parent to Dev Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T14:00:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 35,
        total: 140,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 0,
            pickup: 5,
            review: 30,
            total: 0,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask 3 moved to ready for qa
  {
    operator: 'transition',
    name: 'Subtask 3 moved to ready for qa',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Done,
        getTimestamp('2024-05-20T14:30:00.000Z'),
        3,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 65,
        total: 230,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 30,
            pickup: 5,
            review: 30,
            total: 90,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to Ready For QA
  {
    operator: 'transition',
    name: 'Parent to Ready For QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T14:30:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 65,
        total: 230,
      },
      qa: {
        pickup: 0,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 30,
            pickup: 5,
            review: 30,
            total: 90,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_QA',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to QA In Progress
  {
    operator: 'transition',
    name: 'Parent to QA In Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T15:35:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 65,
        total: 230,
      },
      qa: {
        pickup: 65,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 30,
            pickup: 5,
            review: 30,
            total: 90,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:35:00.000Z'),
          status: 'QA_In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to QA Pass
  {
    operator: 'transition',
    name: 'Parent to QA Pass',
    action: format(
      getChangelog(
        Status.QA_In_Progress,
        Status.QA_Pass_Deploy,
        getTimestamp('2024-05-20T16:10:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 65,
        total: 230,
      },
      qa: {
        pickup: 65,
        testing: 35,
        total: 100,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 30,
            pickup: 5,
            review: 30,
            total: 90,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T16:10:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent to Done
  {
    operator: 'transition',
    name: 'Parent to QA In Progress',
    action: format(
      getChangelog(
        Status.QA_Pass_Deploy,
        Status.Done,
        getTimestamp('2024-05-20T17:30:00.000Z'),
        '118738',
        'Task'
      )
    ).changelog,
    expect: {
      development: {
        coding: 95,
        pickup: 20,
        review: 85,
        handover: 65,
        total: 230,
      },
      qa: {
        pickup: 65,
        testing: 35,
        total: 100,
      },
      deployment: {
        total: 80,
      },
      assignees: [],
      issueId: '118738',
      issueKey: 'PT-13',
      organizationId: '12345',
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 50,
            handover: 5,
            pickup: 5,
            review: 25,
            total: 85,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:35:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '2',
          issueKey: 'PT-2',
          title: 'helo2',
          development: {
            coding: 50,
            handover: 30,
            pickup: 10,
            review: 30,
            total: 120,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T10:30:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:20:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
        {
          issueId: '3',
          issueKey: 'PT-3',
          title: 'helo3',
          development: {
            coding: 25,
            handover: 30,
            pickup: 5,
            review: 30,
            total: 90,
          },
          history: [
            {
              eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Done',
            },
          ],
          assignees: [],
        },
      ],
      title: 'Parent Task [No subtasks]',
      history: [
        {
          eventTime: getTimestamp('2024-05-20T10:10:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:25:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:35:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T16:10:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
        {
          eventTime: getTimestamp('2024-05-20T17:30:00.000Z'),
          status: 'Done',
        },
      ],
      issueType: 'Task',
    },
  },
];

describe('Case 1', () => {
  for (let i = 0; i < operations.length; i++) {
    // for (let i = 0; i < 10; i++) {
    test(`Test ${i}: ${operations[i].name}`, () => {
      let s = {} as MainTicket;
      for (let j = 0; j <= i; j++) {
        const operation = operations[j];
        switch (operation.operator) {
          case 'create_parent':
            s = new MainTicket(operation.action, Status, StatusMapping);
            s.subtasks = [];
            break;
          case 'add_subtask':
            s.addSubtask(operation.action as any);
            break;
          case 'transition':
            s.changelog(operation.action);
            break;
        }
      }
      const { id, isDeleted, deletedAt, ...obj } = s.toJSON().body;
      expect(obj).toStrictEqual(operations[i].expect);
    });
  }
});
