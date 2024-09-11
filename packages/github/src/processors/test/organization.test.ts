import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Github } from 'abstraction';
import { Organization } from '../organization';

// eslint-disable-next-line max-lines-per-function
export function generateuniqIds() {
  return '16a1e334-d9a5-4a00-8933-0c452eb87244';
}

describe('Organization', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.setSystemTime(new Date('2023-09-01T12:34:56Z').toISOString());
  });
  const mockData: Github.ExternalType.Webhook.Installation = {
    action: 'created',
    installationData: {
      id: 12345,
    },
    installation: {
      id: 54321,
      account: {
        login: 'octocat',
        id: 123,
        node_id: 'MDQ6VXNlcjE=',
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
        gravatar_id: '',
        url: 'https://api.github.com/users/octocat',
        html_url: 'https://github.com/octocat',
        followers_url: 'https://api.github.com/users/octocat/followers',
        following_url: 'https://api.github.com/users/octocat/following{/other_user}',
        gists_url: 'https://api.github.com/users/octocat/gists{/gist_id}',
        starred_url: 'https://api.github.com/users/octocat/starred{/owner}{/repo}',
        subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
        organizations_url: 'https://api.github.com/users/octocat/orgs',
        repos_url: 'https://api.github.com/users/octocat/repos',
        events_url: 'https://api.github.com/users/octocat/events{/privacy}',
        received_events_url: 'https://api.github.com/users/octocat/received_events',
        type: 'User',
        site_admin: false,
      },
      repository_selection: 'all',
      access_tokens_url: 'https://api.github.com/installations/54321/access_tokens',
      repositories_url: 'https://api.github.com/installation/repositories',
      html_url: 'https://github.com/organizations/github/settings/installations/54321',
      app_id: 123,
      app_slug: 'octoapp',
      target_id: 1,
      target_type: 'User',
      permissions: {
        members: 'read',
        organization_custom_roles: 'read',
        organization_events: 'read',
        organization_hooks: 'write',
        organization_user_blocking: 'read',
        actions: 'write',
        actions_variables: 'read',
        administration: 'write',
        checks: 'write',
        codespaces: 'write',
        codespaces_lifecycle_admin: 'write',
        codespaces_metadata: 'read',
        contents: 'write',
        dependabot_secrets: 'read',
        deployments: 'write',
        discussions: 'write',
        environments: 'read',
        issues: 'write',
        merge_queues: 'write',
        metadata: 'read',
        packages: 'read',
        pages: 'read',
        pull_requests: 'write',
        repository_advisories: 'read',
        repository_hooks: 'write',
        repository_projects: 'read',
        security_events: 'read',
        statuses: 'read',
        vulnerability_alerts: 'read',
      },
      events: ['push', 'pull_request'],
      created_at: '2023-09-01T12:34:56Z',
      updated_at: '2023-09-01T12:34:56Z',
      deleted_at: '',
      single_file_name: null,
      has_multiple_single_files: false,
      single_file_paths: [],
      suspended_by: null,
      suspended_at: null,
    },
    repositories: [
      {
        id: 1296269,
        node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
        name: 'Hello-World',
        full_name: 'octocat/Hello-World',
        private: false,
      },
      {
        id: 9876543,
        node_id: 'MDEwOlJlcG9zaXRvcnk5ODc2NTQz',
        name: 'octo-repo',
        full_name: 'octocat/octo-repo',
        private: true,
      },
    ],
    requester: null,
    sender: {
      login: 'octocat',
      id: 1,
      node_id: 'MDQ6VXNlcjE=',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      gravatar_id: '',
      url: 'https://api.github.com/users/octocat',
      html_url: 'https://github.com/octocat',
      followers_url: 'https://api.github.com/users/octocat/followers',
      following_url: 'https://api.github.com/users/octocat/following{/other_user}',
      gists_url: 'https://api.github.com/users/octocat/gists{/gist_id}',
      starred_url: 'https://api.github.com/users/octocat/starred{/owner}{/repo}',
      subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
      organizations_url: 'https://api.github.com/users/octocat/orgs',
      repos_url: 'https://api.github.com/users/octocat/repos',
      events_url: 'https://api.github.com/users/octocat/events{/privacy}',
      received_events_url: 'https://api.github.com/users/octocat/received_events',
      type: 'User',
      site_admin: false,
    },
  };

  const mockGetParentId = vi.fn().mockResolvedValue('16a1e334-d9a5-4a00-8933-0c452eb87244');

  it('should process the organization installation create event', async () => {
    const org = new Organization(
      Github.Enums.OrgInstallation.Created,
      mockData,
      String(mockData.installationData.id),
      mockData.installation.account.login
    );
    org.getParentId = mockGetParentId;
    await org.process();
    const result = org.formattedData;
    expect(result.id).toEqual('16a1e334-d9a5-4a00-8933-0c452eb87244');
    expect(result.body.githubOrganizationId).toEqual(123);
    expect(result.body.name).toEqual('octocat');
    expect(result.body.installationId).toEqual(12345);
    expect(result.body.appId).toEqual(123);
    expect(result.body.createdAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.updatedAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.deletedAt).toEqual(null);
    expect(result.body.isDeleted).toEqual(false);
  });

  it('generates uuid incase no parentId is found', async () => {
    const org = new Organization(
      Github.Enums.OrgInstallation.Created,
      mockData,
      String(mockData.installationData.id),
      mockData.installation.account.login
    );
    org.getParentId = vi.fn().mockResolvedValue(null);
    vi.mock('uuid', () => ({
      v4: vi.fn().mockReturnValue(generateuniqIds()),
    }));
    org.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());

    await org.process();
    const result = org.formattedData;
    expect(result.id).toEqual(generateuniqIds());
    expect(result.body.githubOrganizationId).toEqual(123);
    expect(result.body.name).toEqual('octocat');
    expect(result.body.installationId).toEqual(12345);
    expect(result.body.appId).toEqual(123);
    expect(result.body.createdAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.updatedAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.deletedAt).toEqual(null);
    expect(result.body.isDeleted).toEqual(false);
  });

  it('should process organization installation remove event', async () => {
    // Create a new instance of the Organization class with the mock data
    mockData.installation.deleted_at = '2023-09-01T12:34:56Z';
    const org = new Organization(
      Github.Enums.OrgInstallation.Deleted,
      mockData,
      String(mockData.installationData.id),
      mockData.installation.account.login
    );
    org.getParentId = mockGetParentId;
    // Call the processor method and check that it returns the correct result
    await org.process();
    const result = org.formattedData;
    expect(result.id).toEqual(generateuniqIds());
    expect(result.body.githubOrganizationId).toEqual(123);
    expect(result.body.name).toEqual('octocat');
    expect(result.body.installationId).toEqual(12345);
    expect(result.body.appId).toEqual(123);
    expect(result.body.createdAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.updatedAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.deletedAt).toEqual('2023-09-01T12:34:56Z');
    expect(result.body.isDeleted).toEqual(true);
  });
});
