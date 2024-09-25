import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Github } from 'abstraction';
import { UsersProcessor } from '../users';

export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

const mockData = {
  id: 123,
  login: 'my-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
  type: 'User',
  created_at: '2023-08-29T00:00:00Z',
  orgId: '456',
  node_id: 'MDQ6VXNlcjEyMw==',
  gravatar_id: '',
  url: '',
  html_url: '',
  followers_url: '',
  following_url: '',
  gists_url: '',
  starred_url: '',
  subscriptions_url: '',
  organizations_url: '',
  repos_url: '',
  events_url: '',
  received_events_url: '',
  site_admin: false,
  deleted_at: null,
} as Github.ExternalType.Api.User;

const mockDataWithDeleted = {
  id: 123,
  login: 'my-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
  type: 'User',
  created_at: '2023-08-29T00:00:00Z',
  orgId: '456',
  node_id: 'MDQ6VXNlcjEyMw==',
  gravatar_id: '',
  url: '',
  html_url: '',
  followers_url: '',
  following_url: '',
  gists_url: '',
  starred_url: '',
  subscriptions_url: '',
  organizations_url: '',
  repos_url: '',
  events_url: '',
  received_events_url: '',
  site_admin: false,
} as Github.ExternalType.Api.User;
// eslint-disable-next-line max-lines-per-function
describe('Users', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
  });

  const mockGetParentId = vi.fn().mockResolvedValue('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');

  it('should process users data', async () => {
    // Create a new instance of the Users class with the mock data
    const org = new UsersProcessor(
      Github.Enums.Organization.MemberAdded,
      mockData,
      String(mockData.id),
      mockData.login,
      ''
    );
    org.getParentId = mockGetParentId;
    await org.process();
    const result = org.formattedData;
    expect(result.id).toEqual('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.action).toEqual([
      { action: 'member_added', actionDay: 'Tuesday', actionTime: new Date().toISOString() },
    ]);
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
  });
  it('generates uuid incase no parentId is found', async () => {
    // Create a new instance of the Users class with the mock data
    const org = new UsersProcessor(
      Github.Enums.Organization.MemberAdded,
      mockData,
      String(mockData.id),
      mockData.login,
      ''
    );
    org.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn(() => generateuniqIds()),
    }));
    org.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());
    // Call the processor method and check that it returns the correct result
    await org.process();
    const result = org.formattedData;
    expect(result.id).toBe('94cc22e3-824b-48d5-8df7-12a9c613596b');
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
  });
  it('set the deletedAt for same user', async () => {
    // Create a new instance of the Users class with the mock data
    mockDataWithDeleted.deleted_at = '2023-08-29T00:00:00Z';

    const org = new UsersProcessor(
      Github.Enums.Organization.MemberRemoved,
      mockDataWithDeleted,
      String(mockData.id),
      mockData.login,
      ''
    );
    org.getParentId = mockGetParentId;
    await org.process();
    const result = org.formattedData;
    expect(result.id).toEqual('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    expect(result.body.githubUserId).toEqual(123);
    expect(result.body.userName).toEqual('my-user');
    expect(result.body.action).toEqual([
      { action: 'member_removed', actionDay: 'Tuesday', actionTime: new Date().toISOString() },
    ]);
    expect(result.body.createdAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.deletedAt).toEqual('2023-08-29T00:00:00Z');
    expect(result.body.isDeleted).toEqual(true);
  });
});
