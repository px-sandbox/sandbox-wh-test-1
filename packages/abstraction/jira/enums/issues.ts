export enum IssuesTypes {
  STORY = 'Story',
  TASK = 'Task',
  BUG = 'Bug',
  EPIC = 'Epic',
  SUBTASK = 'Sub-task',
  TEST = 'Test',
}
export enum ChangelogStatus {
  QA_FAILED = 'QA_Failed',
  READY_FOR_QA = 'Ready_For_QA',
  READY_FOR_UAT = 'Ready_For_UAT',
  QA_PASSED = 'QA_Passed',
  READY_FOR_PROD = 'Ready_For_Prod',
  QA_PASS_DEPLOY = 'QA_Pass_Deploy',
  DONE = 'Done',
  TO_DO = 'To_Do',
  IN_PROGRESS = 'In_Progress',
  DEV_COMPLETE = 'Dev_Complete',
  CODE_REVIEW = 'Code_Review',
  DEV_RCA = 'Dev RCA',
  QA_RCA = 'QA RCA',
}
export enum ChangelogField {
  SPRINT = 'Sprint',
  STATUS = 'status',
  CUSTOM = 'custom',
  JIRA = 'jira',
  CUSTOM_FIELD = 'customfield_10007',
  ASSIGNEE = 'assignee',
  SUMMARY = 'summary',
}

export enum IssueTimeTrackerSort {
  estimates = 'body.timeTracker.estimate',
  actual = 'body.timeTracker.actual',
}

export enum IssueTimeTracker {
  estimate = 'estimate',
  actual = 'actual',
}

export enum ChangelogName {
  STATUS = 'status',
  CUSTOM = 'custom',
  JIRA = 'jira',
  SPRINT = 'customfield_10007',
  ASSIGNEE = 'assignee',
  SUMMARY = 'summary',
  LABELS = 'labels',
  DESCRIPTION = 'description',
  PRIORITY = 'priority',
  ISSUE_TYPE = 'issuetype',
  PROJECT = 'project',
  CREATED = 'created',
  UPDATED = 'updated',
  COMMENT = 'comment',
  ATTACHMENT = 'attachment',
  ISSUE_LINK = 'issueLink',
  PARENT = 'parent',
  ISSUE_PARENT_ASSOCIATION = 'IssueParentAssociation',
  WATCHERS = 'watchers',
  TIME_TRACKER = 'timeestimate',
  PROGRESS = 'progress',
  DEV_RCA = 'customfield_11225',
  QA_RCA = 'customfield_11226',
}

export const validChangelogFields = [
  'status',
  'custom',
  'jira',
  'customfield_10007',
  'assignee',
  'summary',
  'labels',
  'description',
  'priority',
  'issuetype',
  'project',
  'created',
  'updated',
  'comment',
  'attachment',
  'issueLink',
  'parent',
  'IssueParentAssociation',
  'watchers',
  'timeestimate',
  'progress',
  'customfield_11225',
  'customfield_11226',
];
