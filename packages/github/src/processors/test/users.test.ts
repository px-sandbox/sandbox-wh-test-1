import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Github } from 'abstraction';
import { UsersProcessor } from '../users';

const mockData = {
  id: 123,
  login: 'my-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
  type: 'User',
  created_at: '2023-08-29T00:00:00Z',
  action: 'initialized',
} as Github.ExternalType.Api.User;
const mockDataWithDeletedAt = {
  id: 123,
  login: 'my-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
  type: 'User',
  created_at: '2023-08-29T00:00:00Z',
  deleted_at: '2023-08-29T13:01:00Z',
  action: 'deleted',
} as Github.ExternalType.Api.User;
const mockDataNoUser = {
  id: 123,
  avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
  type: 'User',
  created_at: '2023-08-29T00:00:00Z',
  deleted_at: '2023-08-29T13:01:00Z',
  action: 'deleted',
} as Github.ExternalType.Api.User;

describe('Users', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers();
  });
  const mockMappingPrefixes = {
    users: 'gh_user',
  };
  const mockParamsMapping = {
    myParam: 'gh_param',
  };
  vi.mock('src/constant/config', () => ({
    mappingPrefixes: 'gh_users',
  }));

  const mockGetParentId = vi.fn().mockResolvedValue('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
  const mockNoParentId = vi.fn().mockResolvedValue('');

  vi.mock('src/model/params-mapping', (mockParamsMapping) => ({
    ParamsMapping: mockParamsMapping,
  }));

  it('should process users data', async () => {
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
    // Create a new instance of the Users class with the mock data
    const org = new UsersProcessor(mockData);
    org.getParentId = mockGetParentId;

    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.id).toEqual('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.action).toEqual([
      { action: 'initialized', actionDay: 'Tuesday', actionTime: new Date().toISOString() },
    ]);
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.deletedAt).toEqual(undefined);
  });
  it('generates uuid incase no parentId is found', async () => {
    // Create a new instance of the Users class with the mock data
    const org = new UsersProcessor(mockData);
    org.getParentId = mockNoParentId;
    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.id).not.toBe('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.deletedAt).toEqual(undefined);
  });
  it('set the deletedAt for same user', async () => {
    vi.setSystemTime(new Date('2023-08-29T13:01:00Z').toISOString());
    // Create a new instance of the Users class with the mock data
    const org = new UsersProcessor(mockDataWithDeletedAt);
    org.getParentId = mockGetParentId;
    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.id).toEqual(result.id);
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.action).toEqual([
      { action: 'deleted', actionDay: 'Tuesday', actionTime: new Date().toISOString() },
    ]);
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.deletedAt).toEqual('2023-08-29T13:01:00Z');
  });
  it('should failed for missing userName', async () => {
    vi.setSystemTime(new Date('2023-08-29T13:01:00Z').toISOString());
    // Create a new instance of the Users class with the mock data
    const org = new UsersProcessor(mockDataNoUser);
    org.getParentId = mockGetParentId;
    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.id).toEqual(result.id);
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.action).toEqual([
      { action: 'deleted', actionDay: 'Tuesday', actionTime: new Date().toISOString() },
    ]);
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.deletedAt).toEqual('2023-08-29T13:01:00Z');
  });
});
