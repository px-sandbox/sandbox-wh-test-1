import { Table } from 'sst/constructs';

export type JiraTables = {
  jiraMappingTable: Table;
  jiraCredsTable: Table;
  processJiraRetryTable: Table;
};

export type GithubTables = {
  githubMappingTable: Table;
  retryProcessTable: Table;
};