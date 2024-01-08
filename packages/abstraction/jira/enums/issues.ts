export enum IssuesTypes {
  STORY = 'Story',
  TASK = 'Task',
  BUG = 'Bug',
  EPIC = 'Epic',
}
export enum ChangelogStatus {
  QA_FAILED = 'QA_Failed',
  READY_FOR_QA = 'Ready_For_QA',
  Ready_For_UAT = 'Ready_For_UAT',
  QA_PASSED = 'QA_Passed',
  Ready_For_Prod = 'Ready_For_Prod',
  QA_Pass_Deployed = 'QA_Pass_Deployed',
}
export enum ChangelogField {
  SPRINT = 'Sprint',
  STATUS = 'status',
  CUSTOM = 'custom',
  JIRA = 'jira',
}
