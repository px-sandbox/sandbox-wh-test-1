import { Stack } from 'aws-cdk-lib';
import { Bucket, Table } from 'sst/constructs';
import { initializeRepoLibraryV2Stack } from './queue/repo-library-v2-stack';

export function initializeGithubV2Stack(
  stack: Stack,
  githubDDb: {
    githubMappingTable: Table;
    retryProcessTable: Table;
    libMasterTable: Table;
  },
  versionUpgradeBucket: Bucket
) {
  const queues = initializeRepoLibraryV2Stack(stack, githubDDb, versionUpgradeBucket);
  return { queues };
} 