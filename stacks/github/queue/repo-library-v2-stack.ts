import { Stack } from 'aws-cdk-lib';
import { Bucket, Queue } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { initializeRepoLibraryQueueV2 } from './repo-library-v2';

export function initializeRepoLibraryV2Stack(
  stack: Stack,
  githubDDb: GithubTables,
  versionUpgradeBucket: Bucket
): Record<string, Queue> {
  const [masterLibraryQueueV2, repoLibS3QueueV2] = initializeRepoLibraryQueueV2(
    stack,
    githubDDb,
    versionUpgradeBucket,
    existingMasterLibraryQueue
  );

  return {
    masterLibraryQueueV2,
    repoLibS3QueueV2,
  };
} 