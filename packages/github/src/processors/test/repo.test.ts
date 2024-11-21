import { Github } from 'abstraction';
import moment from 'moment';
import { describe, expect, it, vi } from 'vitest';
import { RepositoryProcessor } from '../repo';

const mockData = {
  id: '123',
  name: 'my-repo',
  description: 'My test repo',
  private: false,
  owner: {
    login: 'my-user',
    id: '123',
  },
  visibility: 'public',
  open_issues_count: 0,
  topics: ['test'],
  created_at: '2024-09-04T00:00:00Z',
  pushed_at: '2024-09-04T00:00:00Z',
  updated_at: '2024-09-04T00:00:00Z',
  action: 'initialized',
} as Github.ExternalType.Api.Repository;

const mockGetParentId = vi.fn().mockResolvedValue('93f855b4-15ca-4d81-bfb3-c8ee38abfdfd');
vi.setSystemTime(new Date('2024-09-04T00:00:00Z').toISOString());
describe('Repository', () => {
  it('should process with existing parentId', async () => {
    const processor = new RepositoryProcessor('created', mockData, mockData.id, mockData.name, '');
    processor.getParentId = mockGetParentId;
    await processor.process();
    const result = processor.formattedData;
    expect(result).toEqual({
      id: result.id,
      body: {
        id: 'gh_repo_123',
        githubRepoId: '123',
        name: 'my-repo',
        description: 'My test repo',
        isPrivate: false,
        owner: 'my-user',
        visibility: 'public',
        openIssuesCount: 0,
        topics: ['test'],
        createdAt: '2024-09-04T00:00:00Z',
        pushedAt: '2024-09-04T00:00:00Z',
        updatedAt: '2024-09-04T00:00:00Z',
        organizationId: 'gh_org_123',
        action: [
          {
            action: 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-04T00:00:00Z').format('dddd'),
        computationalDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        githubDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        isDeleted: false,
      },
    });
  });
  it('should process without existing parentId', async () => {
    const processor = new RepositoryProcessor('created', mockData, mockData.id, mockData.name, '');
    processor.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn(() => '1f45c1c7-ce85-49cb-a044-e304d5202d12'),
    }));
    processor.putDataToDynamoDB = vi.fn().mockResolvedValue('1f45c1c7-ce85-49cb-a044-e304d5202d12');
    await processor.process();
    const result = processor.formattedData;
    expect(result).toEqual({
      id: result.id,
      body: {
        id: 'gh_repo_123',
        githubRepoId: '123',
        name: 'my-repo',
        description: 'My test repo',
        isPrivate: false,
        owner: 'my-user',
        visibility: 'public',
        openIssuesCount: 0,
        topics: ['test'],
        createdAt: '2024-09-04T00:00:00Z',
        pushedAt: '2024-09-04T00:00:00Z',
        updatedAt: '2024-09-04T00:00:00Z',
        organizationId: 'gh_org_123',
        action: [
          {
            action: 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-04T00:00:00Z').format('dddd'),
        computationalDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        githubDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        isDeleted: false,
      },
    });
  });
  it('Create event', async () => {
    const processor = new RepositoryProcessor('created', mockData, mockData.id, mockData.name, '');
    processor.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn(() => 'ebbbe179-773d-4ea5-ae7c-bb603bfe867a'),
    }));
    processor.putDataToDynamoDB = vi.fn().mockResolvedValue('ebbbe179-773d-4ea5-ae7c-bb603bfe867a');
    await processor.process();
    const result = processor.formattedData;
    expect(result).toEqual({
      id: result.id,
      body: {
        id: 'gh_repo_123',
        githubRepoId: '123',
        name: 'my-repo',
        description: 'My test repo',
        isPrivate: false,
        owner: 'my-user',
        visibility: 'public',
        openIssuesCount: 0,
        topics: ['test'],
        createdAt: '2024-09-04T00:00:00Z',
        pushedAt: '2024-09-04T00:00:00Z',
        updatedAt: '2024-09-04T00:00:00Z',
        organizationId: 'gh_org_123',
        action: [
          {
            action: 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-04T00:00:00Z').format('dddd'),
        computationalDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        githubDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        isDeleted: false,
      },
    });
  });
  it('Delete event', async () => {
    const processor = new RepositoryProcessor('deleted', mockData, mockData.id, mockData.name, '');
    processor.getParentId = mockGetParentId;
    await processor.process();
    const result = processor.formattedData;
    expect(result).toEqual({
      id: result.id,
      body: {
        id: 'gh_repo_123',
        githubRepoId: '123',
        name: 'my-repo',
        description: 'My test repo',
        isPrivate: false,
        owner: 'my-user',
        visibility: 'public',
        openIssuesCount: 0,
        topics: ['test'],
        createdAt: '2024-09-04T00:00:00Z',
        pushedAt: '2024-09-04T00:00:00Z',
        updatedAt: '2024-09-04T00:00:00Z',
        organizationId: 'gh_org_123',
        action: [
          {
            action: 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment('2024-09-04T00:00:00Z').format('dddd'),
        computationalDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        githubDate: moment('2024-09-04T00:00:00Z').format('YYYY-MM-DD'),
        isDeleted: true,
      },
    });
  });
});
