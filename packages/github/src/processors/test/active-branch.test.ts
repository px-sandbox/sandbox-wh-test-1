import { Github } from 'abstraction';
import { describe, it, vi } from 'vitest';
import { mappingPrefixes } from '../../constant/config';
import { ActiveBranchProcessor } from '../active-branch';

export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

describe('ActiveBranchProcessor', async () => {
  const mockData: Github.Type.RawActiveBRanches = {
    repoId: 'gh_repo_1',
    organizationId: 'gh_org_1',
    createdAt: '2024-09-04T00:00:00Z',
    branchesCount: 4,
  };

  it('should format the data correctly', async ({ expect }) => {
    const mockRequestId = '9876543221';
    const activeBranch = new ActiveBranchProcessor(mockData, mockRequestId, mockData.repoId, ' ');

    // Mock parentId method
    activeBranch.parentId = vi.fn().mockResolvedValue(generateuniqIds());

    await activeBranch.process();

    const expectedFormattedData = {
      id: generateuniqIds(),
      body: {
        id: `${mappingPrefixes.branch_count}_${mockData.repoId}_${mockData.createdAt}`,
        repoId: mockData.repoId,
        organizationId: mockData.organizationId,
        createdAt: mockData.createdAt,
        branchesCount: mockData.branchesCount,
      },
    };

    expect(activeBranch.formattedData).toEqual(expectedFormattedData);
  });

  it('should update the branch count correctly', async ({ expect }) => {
    const mockRequestId = '1234567890';
    mockData.branchesCount = 5;
    const activeBranch = new ActiveBranchProcessor(mockData, mockRequestId, mockData.repoId, ' ');
    activeBranch.parentId = vi.fn().mockResolvedValue(generateuniqIds());
    await activeBranch.process();
    const expectedFormattedData = {
      id: generateuniqIds(),
      body: {
        id: `${mappingPrefixes.branch_count}_${mockData.repoId}_${mockData.createdAt}`,
        repoId: mockData.repoId,
        organizationId: mockData.organizationId,
        createdAt: mockData.createdAt,
        branchesCount: mockData.branchesCount,
      },
    };
    expect(activeBranch.formattedData).toEqual(expectedFormattedData);
  });
});
