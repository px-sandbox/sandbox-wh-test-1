export enum IssuesTypes {
  STORY = 'Story',
  TASK = 'Task',
  BUG = 'Bug',
  EPIC = 'Epic',
  SUBTASK = 'Subtask',
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
}
export enum ChangelogField {
  SPRINT = 'Sprint',
  STATUS = 'status',
  CUSTOM = 'custom',
  JIRA = 'jira',
}

export enum IssueTimeTrackerSort {
  estimates = 'body.timeTracker.estimate',
  actual = 'body.timeTracker.actual',
}

export enum IssueTimeTracker {
  estimates = 'estimates',
  actual = 'actual',
}
