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
    action: format(getIssueCreate(getTimestamp('2024-05-20T01:00:00.000Z'))),
    expect: {
      id: '118738',
      body: {
        id: '118738',
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
        isDeleted: false,
        deletedAt: null,
      },
    },
  },
  {
    name: 'In_Progress',
    action: format(
      getChangelog(Status.To_Do, Status.In_Progress, getTimestamp('2024-05-20T01:10:00.000Z'))
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
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
            eventTime: 1716167400000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'Ready_For_Review',
    action: format(
      getChangelog(
        Status.In_Progress,
        Status.Ready_For_Review,
        getTimestamp('2024-05-20T01:30:00.000Z')
      )
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
        development: {
          coding: 20,
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
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'Code_Review',
    action: format(
      getChangelog(
        Status.Ready_For_Review,
        Status.Code_Review,
        getTimestamp('2024-05-20T01:40:00.000Z')
      )
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
        development: {
          coding: 20,
          pickup: 10,
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
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
            status: 'Ready_For_Review',
          },
          {
            eventTime: 1716169200000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'Dev_Complete',
    action: format(
      getChangelog(
        Status.Code_Review,
        Status.Dev_Complete,
        getTimestamp('2024-05-20T01:50:00.000Z')
      )
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
        development: {
          coding: 20,
          pickup: 10,
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
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
            status: 'Ready_For_Review',
          },
          {
            eventTime: 1716169200000,
            status: 'Code_Review',
          },
          {
            eventTime: 1716169800000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'Ready_For_QA',
    action: format(
      getChangelog(
        Status.Dev_Complete,
        Status.Ready_For_QA,
        getTimestamp('2024-05-20T02:00:00.000Z')
      )
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
        development: {
          coding: 20,
          pickup: 10,
          review: 10,
          handover: 10,
          total: 50,
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
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
            status: 'Ready_For_Review',
          },
          {
            eventTime: 1716169200000,
            status: 'Code_Review',
          },
          {
            eventTime: 1716169800000,
            status: 'Dev_Complete',
          },
          {
            eventTime: 1716170400000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'QA_In_Progress',
    action: format(
      getChangelog(
        Status.Ready_For_QA,
        Status.QA_In_Progress,
        getTimestamp('2024-05-20T02:05:00.000Z')
      )
    ),
    expect: {
      id: '118738',
      body: {
        development: {
          coding: 20,
          pickup: 10,
          review: 10,
          handover: 10,
          total: 50,
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
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
            status: 'Ready_For_Review',
          },
          {
            eventTime: 1716169200000,
            status: 'Code_Review',
          },
          {
            eventTime: 1716169800000,
            status: 'Dev_Complete',
          },
          {
            eventTime: 1716170400000,
            status: 'Ready_For_QA',
          },
          {
            eventTime: 1716170700000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'QA_Pass_Deploy',
    action: format(
      getChangelog(
        Status.QA_In_Progress,
        Status.QA_Pass_Deploy,
        getTimestamp('2024-05-20T02:25:00.000Z')
      )
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
        development: {
          coding: 20,
          pickup: 10,
          review: 10,
          handover: 10,
          total: 50,
        },
        qa: {
          pickup: 5,
          testing: 20,
          total: 25,
        },
        deployment: {
          total: 0,
        },
        history: [
          {
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
            status: 'Ready_For_Review',
          },
          {
            eventTime: 1716169200000,
            status: 'Code_Review',
          },
          {
            eventTime: 1716169800000,
            status: 'Dev_Complete',
          },
          {
            eventTime: 1716170400000,
            status: 'Ready_For_QA',
          },
          {
            eventTime: 1716170700000,
            status: 'QA_In_Progress',
          },
          {
            eventTime: 1716171900000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
  {
    name: 'Done',
    action: format(
      getChangelog(Status.QA_Pass_Deploy, Status.Done, getTimestamp('2024-05-20T04:00:00.000Z'))
    ),
    expect: {
      id: '118738',
      body: {
        id: '118738',
        development: {
          coding: 20,
          pickup: 10,
          review: 10,
          handover: 10,
          total: 50,
        },
        qa: {
          pickup: 5,
          testing: 20,
          total: 25,
        },
        deployment: {
          total: 95,
        },
        history: [
          {
            eventTime: 1716167400000,
            status: 'In_Progress',
          },
          {
            eventTime: 1716168600000,
            status: 'Ready_For_Review',
          },
          {
            eventTime: 1716169200000,
            status: 'Code_Review',
          },
          {
            eventTime: 1716169800000,
            status: 'Dev_Complete',
          },
          {
            eventTime: 1716170400000,
            status: 'Ready_For_QA',
          },
          {
            eventTime: 1716170700000,
            status: 'QA_In_Progress',
          },
          {
            eventTime: 1716171900000,
            status: 'QA_Pass_Deploy',
          },
          {
            eventTime: 1716177600000,
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
        deletedAt: null,
        isDeleted: false,
      },
    },
  },
];

describe('Case 1', () => {
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
