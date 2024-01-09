export enum IssuesTypes {
  STORY = 'Story',
  TASK = 'Task',
  BUG = 'Bug',
  EPIC = 'Epic',
}
export enum ChangelogStatus {
  QA_FAILED = 'QA_Failed',
  READY_FOR_QA = 'Ready_For_QA',
  READY_FOR_UAT = 'Ready_For_UAT',
  QA_PASSED = 'QA_Passed',
  READY_FOR_PROD = 'Ready_For_Prod',
  QA_PASS_DEPLOY = 'QA_Pass_Deploy',
  DONE = 'Done',
}
export enum ChangelogField {
  SPRINT = 'Sprint',
  STATUS = 'status',
  CUSTOM = 'custom',
  JIRA = 'jira',
}
