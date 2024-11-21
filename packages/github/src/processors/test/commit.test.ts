import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Github } from 'abstraction';
import { CommitProcessor } from '../commit';
import { mappingPrefixes } from '../../constant/config';

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
    orgId: 'my-commits-org-id',
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
// eslint-disable-next-line max-lines-per-function
describe('CommitProcessor', () => {
  beforeEach(() => {
    // tell vi we use mocked time
    vi.useFakeTimers();
  });

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
    const commit = new CommitProcessor(mockData, mockData.commits.id, '');
    commit.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    await commit.process();
    expect(commit.formattedData).toEqual({
      id: 'cec133a0-5fe7-42cd-ad7b-4a794dcb38a7',
      body: {
        id: `${mappingPrefixes.commit}_my-commit-id`,
        githubCommitId: 'my-commit-id',
        isMergedCommit: false,
        pushedBranch: 'tse',
        mergedBranch: 'test',
        message: 'my commit message',
        authorId: `${mappingPrefixes.user}_my-author-id`,
        committedAt: '2023-08-29T00:00:00Z',
        changes: [
          {
            filename: 'my-file.txt',
            additions: '1',
            deletions: '1',
            changes: '2',
            status: 'modified',
          },
        ],
        organizationId: `${mappingPrefixes.organization}_my-commits-org-id`,
        totalChanges: '3',
        repoId: `${mappingPrefixes.repo}_my-repo-id`,
        createdAt: '2023-08-29T00:00:00Z',
        createdAtDay: 'Tuesday',
        computationalDate: '2023-08-29',
        githubDate: '2023-08-29',
      },
    });
  });

  it('should process commit data with updated author id', async () => {
    const mockDataWithEmptyAuthor = {
      ...mockData,
      author: null,
    } as unknown as Github.ExternalType.Api.Commit;
    // Create a new instance of the CommitProcessor class with the mock data
    mockDataWithEmptyAuthor.author = {
      login: 'my-author-login',
      id: '1234',
    };
    const commit = new CommitProcessor(
      mockDataWithEmptyAuthor,
      mockDataWithEmptyAuthor.commits.id,
      ''
    );
    commit.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    await commit.process();
    expect(commit.formattedData).toEqual({
      id: 'cec133a0-5fe7-42cd-ad7b-4a794dcb38a7',
      body: {
        id: `${mappingPrefixes.commit}_my-commit-id`,
        githubCommitId: 'my-commit-id',
        isMergedCommit: false,
        pushedBranch: 'tse',
        mergedBranch: 'test',
        message: 'my commit message',
        authorId: `${mappingPrefixes.user}_1234`,
        committedAt: '2023-08-29T00:00:00Z',
        changes: [
          {
            filename: 'my-file.txt',
            additions: '1',
            deletions: '1',
            changes: '2',
            status: 'modified',
          },
        ],
        organizationId: `${mappingPrefixes.organization}_my-commits-org-id`,
        totalChanges: '3',
        repoId: `${mappingPrefixes.repo}_my-repo-id`,
        createdAt: '2023-08-29T00:00:00Z',
        createdAtDay: 'Tuesday',
        computationalDate: '2023-08-29',
        githubDate: '2023-08-29',
      },
    });
  });
  it('should process commit data with files data', async () => {
    const mockDataWithEmptyFiles = {
      ...mockData,
      files: [
        {
          filename: 'src/test.ts',
          additions: '',
          deletions: '',
          changes: '',
          status: '',
        },
      ],
    } as unknown as Github.ExternalType.Api.Commit;
    // Create a new instance of the CommitProcessor class with the mock data
    const commit = new CommitProcessor(
      mockDataWithEmptyFiles,
      mockDataWithEmptyFiles.commits.id,
      ''
    );
    commit.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    await commit.process();
    expect(commit.formattedData).toEqual({
      id: 'cec133a0-5fe7-42cd-ad7b-4a794dcb38a7',
      body: {
        id: `${mappingPrefixes.commit}_my-commit-id`,
        githubCommitId: 'my-commit-id',
        isMergedCommit: false,
        pushedBranch: 'tse',
        mergedBranch: 'test',
        message: 'my commit message',
        authorId: `${mappingPrefixes.user}_my-author-id`,
        committedAt: '2023-08-29T00:00:00Z',
        changes: [
          {
            filename: 'src/test.ts',
            additions: '',
            deletions: '',
            changes: '',
            status: '',
          },
        ],
        totalChanges: '3',
        repoId: `${mappingPrefixes.repo}_my-repo-id`,
        organizationId: `${mappingPrefixes.organization}_my-commits-org-id`,
        createdAt: '2023-08-29T00:00:00Z',
        createdAtDay: 'Tuesday',
        computationalDate: '2023-08-29',
        githubDate: '2023-08-29',
      },
    });
  });
});
