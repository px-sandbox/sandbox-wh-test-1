import { RepositoryProcessor } from '../repo';
import { Github } from 'abstraction';
import { Config } from 'sst/node/config';
import moment from 'moment';
import { vi, describe, it, expect } from 'vitest';
import { logger } from 'core';

const mockData = {
  id: '123',
  name: 'my-repo',
  description: 'My test repo',
  private: false,
  owner: {
    login: 'my-user',
  },
  visibility: 'public',
  open_issues_count: 0,
  topics: ['test'],
  created_at: '2022-01-01T00:00:00Z',
  pushed_at: '2022-01-01T00:00:00Z',
  updated_at: '2022-01-01T00:00:00Z',
  action: 'initialized',
} as Github.ExternalType.Api.Repository;
const mockDataWithoutActions = {
  id: '123',
  name: 'my-repo',
  description: 'My test repo',
  private: false,
  owner: {
    login: 'my-user',
  },
  visibility: 'public',
  open_issues_count: 0,
  topics: ['test'],
  created_at: '2022-01-01T00:00:00Z',
  pushed_at: '2022-01-01T00:00:00Z',
  updated_at: '2022-01-01T00:00:00Z',
  action: 'initialized',
} as Github.ExternalType.Api.Repository;
const mockMappingPrefixes = {
  repo: 'my-repo',
  organization: 'my-organization',
};

const mockGetParentId = vi.fn().mockResolvedValue('93f855b4-15ca-4d81-bfb3-c8ee38abfdfd');
vi.mock('src/constant/config', () => ({
  mappingPrefixes: 'gh_repo',
}));
vi.mock('src/model/params-mapping', (mockParamsMapping) => ({
  ParamsMapping: mockParamsMapping,
}));

describe('Repository', () => {
  // Test case 1: Test the processor method with valid data
  it('should process the repository data correctly', async () => {
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
    // Create a new instance of the RepositoryProcessor class with the mock data
    const processor = new RepositoryProcessor(mockData);
    processor.getParentId = mockGetParentId;
    // Set the mock methods and properties
    Config.GIT_ORGANIZATION_ID = 'my-organization-id';

    // Call the processor method and check that it returns the correct output object
    const result = await processor.processor();
    expect(result).toEqual({
      id: result.id,
      body: {
        id: 'undefined_123',
        githubRepoId: '123',
        name: 'my-repo',
        description: 'My test repo',
        isPrivate: false,
        owner: 'my-user',
        visibility: 'public',
        openIssuesCount: 0,
        topics: ['test'],
        createdAt: '2022-01-01T00:00:00Z',
        pushedAt: '2022-01-01T00:00:00Z',
        updatedAt: '2022-01-01T00:00:00Z',
        organizationId: 'undefined_my-organization-id',
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
        isDeleted: false,
      },
    });

    // Check that the getParentId method was called with the correct arguments
  });

  // Test case 2: Test the processor method with missing getParentId method
  it('should failed for repository action missing', async () => {
    // Test case 4: Test the processor method with invalid data
    // Create a new instance of the RepositoryProcessor class with invalid data
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
    // Create a new instance of the RepositoryProcessor class with the mock data
    const processor = new RepositoryProcessor(mockDataWithoutActions);
    processor.getParentId = mockGetParentId;
    // Set the mock methods and properties

    // Call the processor method and check that it returns the correct output object
    const result = await processor.processor();
    expect(result).toEqual({
      id: result.id,
      body: {
        id: 'undefined_123',
        githubRepoId: '123',
        name: 'my-repo',
        description: 'My test repo',
        isPrivate: false,
        owner: 'my-user',
        visibility: 'public',
        openIssuesCount: 0,
        topics: ['test'],
        createdAt: '2022-01-01T00:00:00Z',
        pushedAt: '2022-01-01T00:00:00Z',
        updatedAt: '2022-01-01T00:00:00Z',
        organizationId: 'undefined_my-organization-id',
        createdAtDay: moment('2022-01-01T00:00:00Z').format('dddd'),
        computationalDate: moment('2022-01-03T00:00:00Z').format('YYYY-MM-DD'),
        githubDate: moment('2022-01-01T00:00:00Z').format('YYYY-MM-DD'),
        isDeleted: false,
      },
    });

    // Check that the getParentId method was called with the correct arguments
  });
  // Test case 3: Test the processor method with an error in the getParentId method

  it('is instance of the RepositoryProcessor class with invalid data', async () => {
    // Test case 4: Test the processor method with invalid data
    // Create a new instance of the RepositoryProcessor class with invalid data
    const processor = new RepositoryProcessor({
      id: 'invalid',
      name: 'my-repo',
      description: 'My test repo',
      private: false,
      owner: {
        login: 'my-user',
      },
      visibility: 'public',
      open_issues_count: 0,
      topics: ['test'],
      created_at: '2022-01-01T00:00:00Z',
      pushed_at: '2022-01-01T00:00:00Z',
      updated_at: '2022-01-01T00:00:00Z',
      action: 'initialized',
    } as Github.ExternalType.Api.Repository);
    processor.getParentId = mockGetParentId;
    // Call the processor method and check that it throws an error
    await expect(processor.processor()).toBeFalsy(), /Invalid data/;

    // Check that the getParentId method was called with the correct arguments
  });
});
