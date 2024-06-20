import { describe, expect, test } from 'vitest';
import { Status, format, getChangelog, getIssueCreate, getTimestamp, issueType } from '../template';
import { StatusMapping } from '../type';
import { MainTicket } from '../../src/lib/issue/main-ticket';

const parentId = '118738';

const operations = [
  // Create Parent Task
  {
    operator: 'create_parent',
    name: 'Create Parent Task',
    action: format(getIssueCreate(getTimestamp('2024-05-20T01:00:00.000Z'))),
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [],
      title: 'Parent Task [No subtasks]',
      issueType: 'Task',
    },
  },
  // Subtask added
  {
    operator: 'add_subtask',
    name: 'Subtask added',
    action: {
      issueId: '1',
      issueKey: 'PT-1',
      title: 'helo1',
      assignees: [],
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
  // Subtask moved to In progress
  {
    operator: 'transition',
    name: 'Subtask moved to In progress',
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
      ],
      title: 'Parent Task [No subtasks]',
      history: [],
      issueType: 'Task',
    },
  },
  // Parent moved to inprogress
  {
    operator: 'transition',
    name: 'Parent moved to inprogress',
    action: format(
      getChangelog(
        Status.To_Do,
        Status.In_Progress,
        getTimestamp('2024-05-20T10:10:00.000Z'),
        parentId,
        issueType.Task
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
  // Subtask moved to Ready for review
  {
    operator: 'transition',
    name: 'Subtask moved to Ready for review',
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
  // Parent moved to Ready for review
  {
    operator: 'transition',
    name: 'Parent moved to Ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T11:00:00.000Z'),
        parentId,
        issueType.Task
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
      ],
      title: 'Parent Task [No subtasks]',
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
      issueType: 'Task',
    },
  },
  // Subtask moved to Code review
  {
    operator: 'transition',
    name: 'Subtask moved to Code review',
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
      ],
      title: 'Parent Task [No subtasks]',
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
      issueType: 'Task',
    },
  },
  // Parent moved to Code review
  {
    operator: 'transition',
    name: 'Parent moved to Code review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T11:05:00.000Z'),
        parentId,
        issueType.Task
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
      ],
      title: 'Parent Task [No subtasks]',
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
      issueType: 'Task',
    },
  },
  // Subt task moved to In PRogress
  {
    operator: 'transition',
    name: 'Subt task moved to In PRogress',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.In_Progress,
        getTimestamp('2024-05-20T11:30:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 50,
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
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
        {
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Ready for review
  {
    operator: 'transition',
    name: 'Subtask moved to Ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T11:50:00.000Z'),
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
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
        {
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Code review
  {
    operator: 'transition',
    name: 'Subtask moved to Code review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T12:00:00.000Z'),
        1,
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 0,
            pickup: 15,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Dev complete
  {
    operator: 'transition',
    name: 'Subtask moved to Dev complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T12:10:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 0,
            pickup: 15,
            review: 35,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Dev Complete
  {
    operator: 'transition',
    name: 'Parent moved to Dev Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T12:10:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 0,
            pickup: 15,
            review: 35,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Ready for qa
  {
    operator: 'transition',
    name: 'Subtask moved to Ready for qa',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Done,
        getTimestamp('2024-05-20T12:30:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
        handover: 20,
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Ready for qa
  {
    operator: 'transition',
    name: 'Parent moved to Ready for qa',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T12:30:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
        handover: 20,
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
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to QA in progress
  {
    operator: 'transition',
    name: 'Parent moved to QA in progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T13:00:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 0,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },

  // starts from here
  // Parent moved to QA Failed
  {
    operator: 'transition',
    name: 'Parent moved to QA Failed',
    action: format(
      getChangelog(
        Status.QA_In_Progress,
        Status.QA_Failed,
        getTimestamp('2024-05-20T13:30:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to In Progress
  {
    operator: 'transition',
    name: 'Subtask moved to In Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.In_Progress,
        getTimestamp('2024-05-20T14:00:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
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
        {
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to In Progress
  {
    operator: 'transition',
    name: 'Parent moved to In Progress',
    action: format(
      getChangelog(
        Status.QA_Failed,
        Status.In_Progress,
        getTimestamp('2024-05-20T14:00:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 70,
        pickup: 15,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 70,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
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
        {
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Ready for review
  {
    operator: 'transition',
    name: 'Subtask moved to Ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T14:30:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 15,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
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
        {
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Ready for review
  {
    operator: 'transition',
    name: 'Parent moved to Ready for review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T14:30:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 15,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 20,
            pickup: 15,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
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
        {
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Code Review
  {
    operator: 'transition',
    name: 'Subtask moved to Code Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T14:40:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 20,
            pickup: 25,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Code Review
  {
    operator: 'transition',
    name: 'Parent moved to Code Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T14:40:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 35,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 20,
            pickup: 25,
            review: 35,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Dev Complete
  {
    operator: 'transition',
    name: 'Subtask moved to Dev Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T15:00:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 20,
            pickup: 25,
            review: 55,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Dev Complete
  {
    operator: 'transition',
    name: 'Parent moved to Dev Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T15:00:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 20,
        total: 140,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 20,
            pickup: 25,
            review: 55,
            total: 140,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      issueType: 'Task',
    },
  },
  // Subtask moved to Ready for QA
  {
    operator: 'transition',
    name: 'Subtask moved to Ready for QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Done,
        getTimestamp('2024-05-20T15:30:00.000Z'),
        1,
        issueType.SubTask
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 50,
        total: 230,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 50,
            pickup: 25,
            review: 55,
            total: 230,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
          status: 'Dev_Complete',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Ready For QA
  {
    operator: 'transition',
    name: 'Parent moved to Ready For QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T15:30:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 50,
        total: 230,
      },
      qa: {
        pickup: 30,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 50,
            pickup: 25,
            review: 55,
            total: 230,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
          status: 'Ready_For_QA',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to QA In Progress
  {
    operator: 'transition',
    name: 'Parent moved to QA In Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T15:40:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 50,
        total: 230,
      },
      qa: {
        pickup: 40,
        testing: 30,
        total: 0,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 50,
            pickup: 25,
            review: 55,
            total: 230,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:40:00.000Z'),
          status: 'QA_In_Progress',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to QA Pass
  {
    operator: 'transition',
    name: 'Parent moved to QA Pass',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_Pass_Deploy,
        getTimestamp('2024-05-20T16:00:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 50,
        total: 230,
      },
      qa: {
        pickup: 40,
        testing: 50,
        total: 90,
      },
      deployment: {
        total: 0,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 50,
            pickup: 25,
            review: 55,
            total: 230,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:40:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T16:00:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
      ],
      issueType: 'Task',
    },
  },
  // Parent moved to Done
  {
    operator: 'transition',
    name: 'Parent moved to Done',
    action: format(
      getChangelog(
        Status.QA_Pass_Deploy,
        Status.Done,
        getTimestamp('2024-05-20T16:30:00.000Z'),
        parentId,
        issueType.Task
      )
    ).changelog,
    expect: {
      development: {
        coding: 100,
        pickup: 25,
        review: 55,
        handover: 50,
        total: 230,
      },
      qa: {
        pickup: 40,
        testing: 50,
        total: 90,
      },
      deployment: {
        total: 30,
      },
      assignees: [],
      issueId: parentId,
      issueKey: 'PT-13',
      orgId: 12345,
      projectId: '14128',
      projectKey: 'PT',
      sprintId: 1764,
      subtasks: [
        {
          issueId: '1',
          issueKey: 'PT-1',
          title: 'helo1',
          development: {
            coding: 100,
            handover: 50,
            pickup: 25,
            review: 55,
            total: 230,
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
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T11:50:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:00:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
              status: 'Done',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
              status: 'In_Progress',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
              status: 'Ready_For_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
              status: 'Code_Review',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
              status: 'Dev_Complete',
            },
            {
              eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
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
          eventTime: getTimestamp('2024-05-20T11:00:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T11:05:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:10:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T12:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:00:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T13:30:00.000Z'),
          status: 'QA_Failed',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:00:00.000Z'),
          status: 'In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:30:00.000Z'),
          status: 'Ready_For_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T14:40:00.000Z'),
          status: 'Code_Review',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:00:00.000Z'),
          status: 'Dev_Complete',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:30:00.000Z'),
          status: 'Ready_For_QA',
        },
        {
          eventTime: getTimestamp('2024-05-20T15:40:00.000Z'),
          status: 'QA_In_Progress',
        },
        {
          eventTime: getTimestamp('2024-05-20T16:00:00.000Z'),
          status: 'QA_Pass_Deploy',
        },
        {
          eventTime: getTimestamp('2024-05-20T16:30:00.000Z'),
          status: 'Done',
        },
      ],
      issueType: 'Task',
    },
  },
];

describe('Case 4', () => {
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
      expect(s.toJSON()).toStrictEqual(operations[i].expect);
    });
  }
});
