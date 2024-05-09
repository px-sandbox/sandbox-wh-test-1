import { Table } from 'sst/constructs';
type retryTable = {
  retryProcessTable: Table;
}
export type JiraTables = {
  jiraMappingTable: Table;
  jiraCredsTable: Table;
} & retryTable;

export type GithubTables = {
  githubMappingTable: Table;
  retryProcessTable: Table;
  libMasterTable: Table;
} & retryTable;