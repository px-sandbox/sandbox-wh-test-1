import { describe, expect, it, vi } from 'vitest';
import { BranchProcessor } from '../branch';

export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

const mockData: any = {
  data: {
    commit: {
      sha: '935d9b2759d73b8622c9527dd1bc40d433b25c84',
      url: 'https://api.github.com/repos/unofficial-samsung/s23/commits/935d9b2759d73b8622c9527dd1bc40d433b25c84',
    },
    id: 'ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
    name: 'charchitDev-patch-2',
    orgId: '178363207',
    protected: false,
    repo_id: 842332619,
  },
};
const mockGetParentId = vi.fn().mockResolvedValue('94cc22e3-824b-48d5-8df7-12a9c613596b');
vi.setSystemTime(new Date('2024-09-04T00:00:00Z').toISOString());

describe('Branch', async () => {
  it('should process the branch data correctly', async () => {
    const processor = new BranchProcessor(
      'create',
      mockData.data,
      '',
      mockData.data.id,
      mockData.data.name
    );
    processor.getParentId = mockGetParentId;
    await processor.process();
    const output = processor.formattedData;
    expect(output).toEqual({
      id: '94cc22e3-824b-48d5-8df7-12a9c613596b',
      body: {
        id: 'gh_branch_ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        githubBranchId: 'ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        name: 'charchitDev-patch-2',
        organizationId: 'gh_org_178363207',
        repoId: 'gh_repo_842332619',
        createdAt: new Date('2024-09-04T00:00:00.000Z'),
        pushedAt: undefined,
        updatedAt: undefined,
        deletedAt: null,
        isDeleted: false,
        action: [
          {
            action: 'create',
            actionTime: '2024-09-04T00:00:00.000Z',
            actionDay: 'Wednesday',
          },
        ],
        createdAtDay: 'Wednesday',
        computationalDate: '2024-09-04',
        githubDate: '2024-09-04',
        protected: false,
      },
    });
  });
  // Test when processor method is called and no parent ID is found
  it('should process the branch data correctly when no parent ID is found', async () => {
    const processor = new BranchProcessor('create', mockData.data, '', mockData.id, mockData.name);
    processor.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn(() => generateuniqIds()),
    }));
    processor.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());
    await processor.process();
    const output = processor.formattedData;
    expect(output).toEqual({
      id: generateuniqIds(),
      body: {
        id: 'gh_branch_ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        githubBranchId: 'ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        name: 'charchitDev-patch-2',
        organizationId: 'gh_org_178363207',
        repoId: 'gh_repo_842332619',
        createdAt: new Date('2024-09-04T00:00:00.000Z'),
        pushedAt: undefined,
        updatedAt: undefined,
        deletedAt: null,
        isDeleted: false,
        action: [
          {
            action: 'create',
            actionTime: '2024-09-04T00:00:00.000Z',
            actionDay: 'Wednesday',
          },
        ],
        createdAtDay: 'Wednesday',
        computationalDate: '2024-09-04',
        githubDate: '2024-09-04',
        protected: false,
      },
    });
  });

  // Test when branch is deleted
  it('should process the branch data correctly when branch is deleted', async () => {
    const processor = new BranchProcessor(
      'delete',
      mockData.data,
      '',
      mockData.data.id,
      mockData.data.name
    );
    processor.getParentId = mockGetParentId;
    await processor.process();
    const output = processor.formattedData;
    expect(output).toEqual({
      id: '94cc22e3-824b-48d5-8df7-12a9c613596b',
      body: {
        id: 'gh_branch_ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        githubBranchId: 'ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        name: 'charchitDev-patch-2',
        organizationId: 'gh_org_178363207',
        repoId: 'gh_repo_842332619',
        createdAt: new Date('2024-09-04T00:00:00.000Z'),
        pushedAt: undefined,
        updatedAt: undefined,
        deletedAt: '2024-09-04T00:00:00.000Z',
        isDeleted: true,
        action: [
          {
            action: 'delete',
            actionTime: '2024-09-04T00:00:00.000Z',
            actionDay: 'Wednesday',
          },
        ],
        createdAtDay: 'Wednesday',
        computationalDate: '2024-09-04',
        githubDate: '2024-09-04',
        protected: false,
      },
    });
  });

  // Test when branch is updated
  it('should process the branch data correctly when branch is deleted', async () => {
    mockData.data.name = 'charchitDev-patch-3';
    const processor = new BranchProcessor(
      'delete',
      mockData.data,
      '',
      mockData.data.id,
      mockData.data.name
    );
    processor.getParentId = mockGetParentId;
    await processor.process();
    const output = processor.formattedData;
    expect(output).toEqual({
      id: '94cc22e3-824b-48d5-8df7-12a9c613596b',
      body: {
        id: 'gh_branch_ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        githubBranchId: 'ODQyMzMyNjE5X2NoYXJjaGl0RGV2LXBhdGNoLTI=',
        name: 'charchitDev-patch-3',
        organizationId: 'gh_org_178363207',
        repoId: 'gh_repo_842332619',
        createdAt: new Date('2024-09-04T00:00:00.000Z'),
        pushedAt: undefined,
        updatedAt: undefined,
        deletedAt: '2024-09-04T00:00:00.000Z',
        isDeleted: true,
        action: [
          {
            action: 'delete',
            actionTime: '2024-09-04T00:00:00.000Z',
            actionDay: 'Wednesday',
          },
        ],
        createdAtDay: 'Wednesday',
        computationalDate: '2024-09-04',
        githubDate: '2024-09-04',
        protected: false,
      },
    });
  });
});
