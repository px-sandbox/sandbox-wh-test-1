import { Github } from 'abstraction';
import { Config } from 'sst/node/config';
import moment from 'moment';
import { expect, it, vi, describe } from 'vitest';
import { BranchProcessor } from '../branch';

const mockData = {
  id: '123',
  name: 'my-branch',
  ref: 'refs/heads/my-branch',
  repo_id: '456',
  created_at: '2022-01-01T00:00:00Z',
  pushed_at: '2022-01-01T00:00:00Z',
  updated_at: '2022-01-01T00:00:00Z',
  action: 'initialized',
  organization_id: '789',
  protected: false,
} as Github.ExternalType.Api.Branch;

// No branch name
const mockData1 = {
  id: '123',
  ref: 'refs/heads/my-branch',
  repo_id: '456',
  created_at: '2022-01-01T00:00:00Z',
  pushed_at: '2022-01-01T00:00:00Z',
  updated_at: '2022-01-01T00:00:00Z',
  action: 'initialized',
  organization_id: '789',
  protected: false,
} as Github.ExternalType.Api.Branch;

vi.mock('src/constant/config', (mockMappingPrefixes) => ({
  mappingPrefixes: mockMappingPrefixes,
}));
vi.mock('src/model/params-mapping', (mockParamsMapping) => ({
  ParamsMapping: mockParamsMapping,
}));
const mockGetParentId = vi.fn().mockResolvedValue('94cc22e3-824b-48d5-8df7-12a9c613596b');
vi.mock('src/constant/config', () => ({
  mappingPrefixes: 'gh_branch',
}));
// eslint-disable-next-line max-lines-per-function
describe('Branch', async () => {
  // Create a new instance of the BranchProcessor class with the mock data
  it('should process the branch data correctly', async () => {
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
    const processor = new BranchProcessor(mockData);

    // Mock the getParentId method
    processor.getParentId = mockGetParentId;

    // Mock the Config module
    Config.GIT_ORGANIZATION_ID = 'my-organization-id';

    // Call the processor method and get the output object
    const output = await processor.processor();
    const data = output.body;

    // Check that the data object has the correct properties and values
    expect(data).toEqual({
      id: 'undefined_123',
      githubBranchId: '123',
      name: 'my-branch',
      organizationId: 'undefined_my-organization-id',
      repoId: 'undefined_456',
      createdAt: '2022-01-01T00:00:00Z',
      pushedAt: '2022-01-01T00:00:00Z',
      updatedAt: '2022-01-01T00:00:00Z',
      deletedAt: undefined,
      isDeleted: false,
      action: [
        {
          action: 'initialized',
          actionTime: new Date().toISOString(),
          actionDay: moment().format('dddd'),
        },
      ],
      createdAtDay: moment('2022-01-01T00:00:00Z').format('dddd'),
      computationalDate: moment('2022-01-03T00:00:00Z').format('YYYY-MM-DD'),
      githubDate: moment('2022-01-01T00:00:00Z').format('YYYY-MM-DD'),
      protected: false,
    });
  });

  it('should not process the missing branch name', async () => {
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
    const processor = new BranchProcessor(mockData1);

    // Mock the getParentId method
    processor.getParentId = mockGetParentId;

    // Mock the Config module
    Config.GIT_ORGANIZATION_ID = 'my-organization-id';

    // Call the processor method and get the output object
    const output = await processor.processor();
    const data = output.body;

    // Check that the data object has the correct properties and values
    expect(data).toEqual({
      id: 'undefined_123',
      githubBranchId: '123',
      organizationId: 'undefined_my-organization-id',
      repoId: 'undefined_456',
      createdAt: '2022-01-01T00:00:00Z',
      pushedAt: '2022-01-01T00:00:00Z',
      updatedAt: '2022-01-01T00:00:00Z',
      deletedAt: undefined,
      isDeleted: false,
      action: [
        {
          action: 'initialized',
          actionTime: new Date().toISOString(),
          actionDay: moment().format('dddd'),
        },
      ],
      createdAtDay: moment('2022-01-01T00:00:00Z').format('dddd'),
      computationalDate: moment('2022-01-03T00:00:00Z').format('YYYY-MM-DD'),
      githubDate: moment('2022-01-01T00:00:00Z').format('YYYY-MM-DD'),
      protected: false,
    });
  });
  // Check that the getParentId method was called with the correct arguments
});
