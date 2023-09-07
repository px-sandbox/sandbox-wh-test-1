import { describe, expect, it, vi } from 'vitest';
import { Organization } from '../organization';
import { Github } from 'abstraction';

describe('Organization', () => {
  const mockData: Github.ExternalType.Api.Organization = {
    id: 'gh_org_123',
    login: 'my-org',
    description: 'My organization',
    company: 'My company',
    location: 'My location',
    email: 'my-org@example.com',
    is_verified: true,
    has_organization_projects: true,
    has_repository_projects: true,
    public_repos: 10,
    private: false,
    owner: { login: 'my-org' },
    visibility: true,
    open_issues_count: 0,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  };
  const mockData1 = {
    login: 'my-org',
    description: 'My organization',
    company: 'My company',
    location: 'My location',
    email: 'my-org@example.com',
    is_verified: true,
    has_organization_projects: true,
    has_repository_projects: true,
    public_repos: 10,
    private: false,
    owner: { login: 'my-org' },
    visibility: true,
    open_issues_count: 0,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  } as Github.ExternalType.Api.Organization;
  const mockMappingPrefixes = {
    organization: 'gh_org',
  };
  const mockParamsMapping = {
    myParam: 'gh_param',
  };
  vi.mock('src/constant/config', () => ({
    mappingPrefixes: 'gh_org',
  }));
  const mockGetParentId = vi.fn().mockResolvedValue('16a1e334-d9a5-4a00-8933-0c452eb87244');
  const IncmockGetParentId = vi.fn().mockResolvedValue('');
  vi.mock('src/model/params-mapping', (mockParamsMapping) => ({
    ParamsMapping: mockParamsMapping,
  }));
  it('should process the organization data correctly', async () => {
    // Create a new instance of the Organization class with the mock data
    const org = new Organization(mockData);
    org.getParentId = mockGetParentId;
    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.id).toEqual('16a1e334-d9a5-4a00-8933-0c452eb87244');
    expect(result.body.githubOrganizationId).toEqual(`${mockMappingPrefixes.organization}_123`);
    expect(result.body.name).toEqual('my-org');
    expect(result.body.description).toEqual('My organization');
    expect(result.body.company).toEqual('My company');
    expect(result.body.location).toEqual('My location');
    expect(result.body.email).toEqual('my-org@example.com');
    expect(result.body.isVerified).toEqual(true);
    expect(result.body.hasOrganizationProjects).toEqual(true);
    expect(result.body.hasRepositoryProjects).toEqual(true);
    expect(result.body.publicRepos).toEqual(10);
    expect(result.body.createdAt).toEqual('2022-01-01T00:00:00Z');
    expect(result.body.updatedAt).toEqual('2022-01-01T00:00:00Z');
    expect(result.body.deletedAt).toEqual(false);
  });
  it('generates uuid incase no parentId is found', async () => {
    // Create a new instance of the Organization class with the mock data
    const org = new Organization(mockData);
    org.getParentId = IncmockGetParentId;
    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.body.githubOrganizationId).toEqual(`${mockMappingPrefixes.organization}_123`);
    expect(result.body.name).toEqual('my-org');
    expect(result.body.description).toEqual('My organization');
    expect(result.body.company).toEqual('My company');
    expect(result.body.location).toEqual('My location');
    expect(result.body.email).toEqual('my-org@example.com');
    expect(result.body.isVerified).toEqual(true);
    expect(result.body.hasOrganizationProjects).toEqual(true);
    expect(result.body.hasRepositoryProjects).toEqual(true);
    expect(result.body.publicRepos).toEqual(10);
    expect(result.body.createdAt).toEqual('2022-01-01T00:00:00Z');
    expect(result.body.updatedAt).toEqual('2022-01-01T00:00:00Z');
    expect(result.body.deletedAt).toEqual(false);
  });
  it('should not proccess data with empty githubOrganizationId', async () => {
    // Create a new instance of the Organization class with the mock data
    const org = new Organization(mockData1);
    org.getParentId = mockGetParentId;
    // Call the processor method and check that it returns the correct result
    const result = await org.processor();
    expect(result.id).toEqual('16a1e334-d9a5-4a00-8933-0c452eb87244');
    expect(result.body.githubOrganizationId).toEqual(`${mockMappingPrefixes.organization}_123`);
    expect(result.body.name).toEqual('my-org');
    expect(result.body.description).toEqual('My organization');
    expect(result.body.company).toEqual('My company');
    expect(result.body.location).toEqual('My location');
    expect(result.body.email).toEqual('my-org@example.com');
    expect(result.body.isVerified).toEqual(true);
    expect(result.body.hasOrganizationProjects).toEqual(true);
    expect(result.body.hasRepositoryProjects).toEqual(true);
    expect(result.body.publicRepos).toEqual(10);
    expect(result.body.createdAt).toEqual('2022-01-01T00:00:00Z');
    expect(result.body.updatedAt).toEqual('higutf7f78g98g87gtvghbnj');
    expect(result.body.deletedAt).toEqual(false);
  });
});
