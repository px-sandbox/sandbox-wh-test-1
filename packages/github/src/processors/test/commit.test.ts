import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Github } from 'abstraction';
import { CommitProcessor } from '../commit';

const mockData = {
  repoId: 'my-repo-id',
  commits: {
    id: 'my-commit-id',
    message: 'my commit message',
    committer: {
      username: 'my committer name',
      email: 'my committer email',
    },
    timestamp: '2023-08-29T00:00:00Z',
    isMergedCommit: false,
    mergedBranch: 'test',
    pushedBranch: 'tse',
  },

  timestamp: '2023-08-29T00:00:00Z',
  author: {
    login: 'my-author-login',
    id: 'my-author-id',
  },
  commit: {
    message: 'my commit message',
    committer: {
      id: 123,
      login: 'my-committer-login',
      date: '2023-08-29T00:00:00Z',
    },
  },
  stats: {
    total: '3',
  },
  committer: {
    id: 'my-committer-id',
  },
  files: [
    {
      filename: 'my-file.txt',
      additions: '1',
      deletions: '1',
      changes: '2',
      status: 'modified',
    },
  ],
  action: 'initialized',
} as Github.ExternalType.Api.Commit;

describe('CommitProcessor', () => {
  beforeEach(() => {
    // tell vi we use mocked time
    vi.useFakeTimers();
  });

  const mockMappingPrefixes = {
    commit: 'gh_commit',
  };
  const mockParamsMapping = {
    myParam: 'gh_param',
  };
  vi.mock('src/constant/config', () => ({
    mappingPrefixes: 'gh_commit',
  }));

  const mockGetParentId = vi.fn().mockResolvedValue('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
  const mockNoParentId = vi.fn().mockResolvedValue('');

  vi.mock('src/model/params-mapping', (mockParamsMapping) => ({
    ParamsMapping: mockParamsMapping,
  }));

  it('should process commit data with parent id', async () => {
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
    // Create a new instance of the CommitProcessor class with the mock data
    const commit = new CommitProcessor(mockData);
    commit.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    const result = await commit.processor();
    expect(result.id).toEqual('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.id).toEqual('undefined_my-commit-id');
    expect(result.body.githubCommitId).toEqual('my-commit-id');
    expect(result.body.isMergedCommit).toEqual(false);
    expect(result.body.pushedBranch).toEqual('tse');
    expect(result.body.mergedBranch).toEqual('test');
    expect(result.body.message).toEqual('my commit message');
    expect(result.body.authorId).toEqual('undefined_my-author-id');
    expect(result.body.committedAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.changes).toEqual([
      {
        filename: 'my-file.txt',
        additions: '1',
        deletions: '1',
        changes: '2',
        status: 'modified',
      },
    ]);
    expect(result.body.totalChanges).toEqual('3');
    expect(result.body.repoId).toEqual('undefined_my-repo-id');
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.createdAtDay).toEqual('Tuesday');
    expect(result.body.computationalDate).toEqual('2023-08-29');
    expect(result.body.githubDate).toEqual('2023-08-29');
  });

  it('should process commit data without parent id', async () => {
    // Create a new instance of the CommitProcessor class with the mock data
    const commit = new CommitProcessor(mockData);
    commit.getParentId = mockNoParentId;

    // Call the processor method and check that it returns the correct result
    const result = await commit.processor();
    expect(result.body.id).toEqual('undefined_my-commit-id');
    expect(result.body.githubCommitId).toEqual('my-commit-id');
    expect(result.body.isMergedCommit).toEqual(false);
    expect(result.body.pushedBranch).toEqual('tse');
    expect(result.body.mergedBranch).toEqual('test');
    expect(result.body.message).toEqual('my commit message');
    expect(result.body.authorId).toEqual('undefined_my-author-id');
    expect(result.body.committedAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.changes).toEqual([
      {
        filename: 'my-file.txt',
        additions: '1',
        deletions: '1',
        changes: '2',
        status: 'modified',
      },
    ]);
    expect(result.body.totalChanges).toEqual('3');
    expect(result.body.repoId).toEqual('undefined_my-repo-id');
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.createdAtDay).toEqual('Tuesday');
    expect(result.body.computationalDate).toEqual('2023-08-29');
    expect(result.body.githubDate).toEqual('2023-08-29');
  });

  it('should process commit data with empty author id', async () => {
    const mockDataWithEmptyAuthor = {
      ...mockData,
      author: null,
    } as unknown as Github.ExternalType.Api.Commit;
    // Create a new instance of the CommitProcessor class with the mock data
    const commit = new CommitProcessor(mockDataWithEmptyAuthor);
    commit.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    const result = await commit.processor();
    expect(result.id).toEqual('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.id).toEqual('undefined_my-commit-id');
    expect(result.body.githubCommitId).toEqual('my-commit-id');
    expect(result.body.isMergedCommit).toEqual(false);
    expect(result.body.pushedBranch).toEqual('tse');
    expect(result.body.mergedBranch).toEqual('test');
    expect(result.body.message).toEqual('my commit message');
    expect(result.body.authorId).toEqual(null);
    expect(result.body.committedAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.changes).toEqual([
      {
        filename: 'my-file.txt',
        additions: '1',
        deletions: '1',
        changes: '2',
        status: 'modified',
      },
    ]);
    expect(result.body.totalChanges).toEqual('3');
    expect(result.body.repoId).toEqual('undefined_my-repo-id');
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.createdAtDay).toEqual('Tuesday');
    expect(result.body.computationalDate).toEqual('2023-08-29');
    expect(result.body.githubDate).toEqual('2023-08-29');
  });

  it('should process commit data with empty files', async () => {
    const mockDataWithEmptyFiles = {
      ...mockData,
      files: [],
    } as unknown as Github.ExternalType.Api.Commit;
    // Create a new instance of the CommitProcessor class with the mock data
    const commit = new CommitProcessor(mockDataWithEmptyFiles);
    commit.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    const result = await commit.processor();
    expect(result.id).toEqual('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.id).toEqual('undefined_my-commit-id');
    expect(result.body.githubCommitId).toEqual('my-commit-id');
    expect(result.body.isMergedCommit).toEqual(false);
    expect(result.body.pushedBranch).toEqual('tse');
    expect(result.body.mergedBranch).toEqual('test');
    expect(result.body.message).toEqual('my commit message');
    expect(result.body.authorId).toEqual('undefined_my-author-id');
    expect(result.body.committedAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.changes).toEqual([]);
    expect(result.body.totalChanges).toEqual('3');
    expect(result.body.repoId).toEqual('undefined_my-repo-id');
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.createdAtDay).toEqual('Tuesday');
    expect(result.body.computationalDate).toEqual('2023-08-29');
    expect(result.body.githubDate).toEqual('2023-08-29');
  });
});
