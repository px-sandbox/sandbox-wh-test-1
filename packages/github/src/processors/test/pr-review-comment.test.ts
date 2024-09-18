import { describe, it, vi, expect } from 'vitest';
import { mappingPrefixes } from '../../constant/config';
import { PRReviewCommentProcessor } from '../pr-review-comment';
import { PRReviewComment } from 'abstraction/github/external/webhook';
import moment from 'moment';

export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

const mockGetParentId = vi.fn().mockResolvedValue('94cc22e3-824b-48d5-8df7-12a9c613596b');
vi.setSystemTime(new Date('2024-09-04T00:00:00Z').toISOString());

const mockPRReviewComment: PRReviewComment = {
  pull_request_review_id: 12345,
  id: 14556,
  diff_hunk: '@@ -1,5 +1,9 @@ Some code changes...',
  path: 'src/components/Button.tsx',
  commit_id: 'abc123def456ghi789jkl012mno345pqr678stu9',
  original_commit_id: 'zyx987wvu654tsr321qpo098nml765kji432fed1',
  user: {
    id: 112233,
    type: 'User',
  },
  body: 'Jaskeerat-test',
  created_at: '2024-09-12T12:34:56Z',
  updated_at: '2024-09-13T08:45:12Z',
  reactions: {
    total_count: 4,
    '+1': 2,
    '-1': 0,
    laugh: 1,
    hooray: 1,
    confused: 0,
    heart: 0,
    rocket: 0,
    eyes: 0,
  },
  action: 'created',
  orgId: 556677,
};

describe('preReviewCommentProcessor', async () => {
  it('should process the PR data correctly', async () => {
    let PRComment = new PRReviewCommentProcessor(
      mockPRReviewComment,
      5678,
      1234,
      'CREATED',
      mockPRReviewComment.orgId,
      'jvndkbvkjvbrivir_sdjnejkgn_34234',
      'ekjrnijnjk_ejknorei_jnfjj23'
    );
    PRComment.parentId = mockGetParentId;
    await PRComment.process();
    const output = PRComment.formattedData;
    expect(output).toEqual({
      id: '94cc22e3-824b-48d5-8df7-12a9c613596b',
      body: {
        id: `${mappingPrefixes.pRReviewComment}_14556`,
        githubPRReviewCommentId: 14556,
        pRReviewId: 12345,
        diffHunk: '@@ -1,5 +1,9 @@ Some code changes...',
        path: 'src/components/Button.tsx',
        commitId: `${mappingPrefixes.commit}_abc123def456ghi789jkl012mno345pqr678stu9`,
        commentedBy: `${mappingPrefixes.user}_112233`,
        commentBody: 'Jaskeerat-test',
        createdAt: '2024-09-12T12:34:56Z',
        updatedAt: '2024-09-13T08:45:12Z',
        reactions: {
          totalCount: 4,
          '+1': 2,
          '-1': 0,
          laugh: 1,
          hooray: 1,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
        pullId: `${mappingPrefixes.pull}_5678`,
        repoId: `${mappingPrefixes.repo}_1234`,
        organizationId: `${mappingPrefixes.organization}_556677`,
        action: [
          {
            action: 'CREATED',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-12T12:34:56Z').format('dddd'),
        computationalDate: await PRComment.calculateComputationalDate('2024-09-12T12:34:56Z'),
        githubDate: moment('2024-09-12T12:34:56Z').format('YYYY-MM-DD'),
        isDeleted: false,
      },
    });
  });

  it('should process the data correctly when no parent Id is found', async () => {
    let PRComment = new PRReviewCommentProcessor(
      mockPRReviewComment,
      5678,
      1234,
      'CREATED',
      mockPRReviewComment.orgId,
      'jvndkbvkjvbrivir_sdjnejkgn_34234',
      'ekjrnijnjk_ejknorei_jnfjj23'
    );

    console.log(PRComment);
    PRComment.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn(() => generateuniqIds()),
    }));
    PRComment.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());
    await PRComment.process();
    const output = await PRComment.formattedData;

    expect(output).toEqual({
      id: generateuniqIds(),
      body: {
        id: `${mappingPrefixes.pRReviewComment}_14556`,
        githubPRReviewCommentId: 14556,
        pRReviewId: 12345,
        diffHunk: '@@ -1,5 +1,9 @@ Some code changes...',
        path: 'src/components/Button.tsx',
        commitId: `${mappingPrefixes.commit}_abc123def456ghi789jkl012mno345pqr678stu9`,
        commentedBy: `${mappingPrefixes.user}_112233`,
        commentBody: 'Jaskeerat-test',
        createdAt: '2024-09-12T12:34:56Z',
        updatedAt: '2024-09-13T08:45:12Z',
        reactions: {
          totalCount: 4,
          '+1': 2,
          '-1': 0,
          laugh: 1,
          hooray: 1,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
        pullId: `${mappingPrefixes.pull}_5678`,
        repoId: `${mappingPrefixes.repo}_1234`,
        organizationId: `${mappingPrefixes.organization}_556677`,
        action: [
          {
            action: 'CREATED',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],

        createdAtDay: moment('2024-09-12T12:34:56Z').format('dddd'),
        computationalDate: await PRComment.calculateComputationalDate('2024-09-12T12:34:56Z'),
        githubDate: moment('2024-09-12T12:34:56Z').format('YYYY-MM-DD'),
        isDeleted: false,
      },
    });
  });

  //Deleted test cases
  const DeleteMockPRReviewComment: PRReviewComment = {
    pull_request_review_id: 12345,
    id: 14556,
    diff_hunk: '@@ -1,5 +1,9 @@ Some code changes...',
    path: 'src/components/Button.tsx',
    commit_id: 'abc123def456ghi789jkl012mno345pqr678stu9',
    original_commit_id: 'zyx987wvu654tsr321qpo098nml765kji432fed1',
    user: {
      id: 112233,
      type: 'User',
    },
    body: 'Jaskeerat-test',
    created_at: '2024-09-12T12:34:56Z',
    updated_at: '2024-09-13T08:45:12Z',
    reactions: {
      total_count: 4,
      '+1': 2,
      '-1': 0,
      laugh: 1,
      hooray: 1,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    action: 'deleted',
    orgId: 556677,
  };

  it('should process the deleted PR data correctly', async () => {
    let PRComment = new PRReviewCommentProcessor(
      DeleteMockPRReviewComment,
      5678,
      1234,
      'DELETED',
      DeleteMockPRReviewComment.orgId,
      'jvndkbvkjvbrivir_sdjnejkgn_34234',
      'ekjrnijnjk_ejknorei_jnfjj23'
    );
    PRComment.parentId = mockGetParentId;
    await PRComment.process();
    const output = PRComment.formattedData;
    expect(output).toEqual({
      id: '94cc22e3-824b-48d5-8df7-12a9c613596b',
      body: {
        id: `${mappingPrefixes.pRReviewComment}_14556`,
        githubPRReviewCommentId: 14556,
        pRReviewId: 12345,
        diffHunk: '@@ -1,5 +1,9 @@ Some code changes...',
        path: 'src/components/Button.tsx',
        commitId: `${mappingPrefixes.commit}_abc123def456ghi789jkl012mno345pqr678stu9`,
        commentedBy: `${mappingPrefixes.user}_112233`,
        commentBody: 'Jaskeerat-test',
        createdAt: '2024-09-12T12:34:56Z',
        updatedAt: '2024-09-13T08:45:12Z',
        reactions: {
          totalCount: 4,
          '+1': 2,
          '-1': 0,
          laugh: 1,
          hooray: 1,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
        pullId: `${mappingPrefixes.pull}_5678`,
        repoId: `${mappingPrefixes.repo}_1234`,
        organizationId: `${mappingPrefixes.organization}_556677`,
        action: [
          {
            action: 'DELETED',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-12T12:34:56Z').format('dddd'),
        computationalDate: await PRComment.calculateComputationalDate('2024-09-12T12:34:56Z'),
        githubDate: moment('2024-09-12T12:34:56Z').format('YYYY-MM-DD'),
        isDeleted: true,
      },
    });
  });

  it('should process the data correctly when no parent Id is found', async () => {
    let PRComment = new PRReviewCommentProcessor(
      mockPRReviewComment,
      5678,
      1234,
      'DELETED',
      mockPRReviewComment.orgId,
      'jvndkbvkjvbrivir_sdjnejkgn_34234',
      'ekjrnijnjk_ejknorei_jnfjj23'
    );

    console.log(PRComment);
    PRComment.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn(() => generateuniqIds()),
    }));
    PRComment.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());
    await PRComment.process();
    const output = await PRComment.formattedData;

    expect(output).toEqual({
      id: generateuniqIds(),
      body: {
        id: `${mappingPrefixes.pRReviewComment}_14556`,
        githubPRReviewCommentId: 14556,
        pRReviewId: 12345,
        diffHunk: '@@ -1,5 +1,9 @@ Some code changes...',
        path: 'src/components/Button.tsx',
        commitId: `${mappingPrefixes.commit}_abc123def456ghi789jkl012mno345pqr678stu9`,
        commentedBy: `${mappingPrefixes.user}_112233`,
        commentBody: 'Jaskeerat-test',
        createdAt: '2024-09-12T12:34:56Z',
        updatedAt: '2024-09-13T08:45:12Z',
        reactions: {
          totalCount: 4,
          '+1': 2,
          '-1': 0,
          laugh: 1,
          hooray: 1,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
        pullId: `${mappingPrefixes.pull}_5678`,
        repoId: `${mappingPrefixes.repo}_1234`,
        organizationId: `${mappingPrefixes.organization}_556677`,
        action: [
          {
            action: 'DELETED',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-12T12:34:56Z').format('dddd'),
        computationalDate: await PRComment.calculateComputationalDate('2024-09-12T12:34:56Z'),
        githubDate: moment('2024-09-12T12:34:56Z').format('YYYY-MM-DD'),
        isDeleted: true,
      },
    });
  });
});
