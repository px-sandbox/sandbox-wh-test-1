import { Organization } from '../abstraction/external/organization';
import { v4 as uuid } from 'uuid';

export async function organizationFormator(
  data: Organization,
  oldId?: string
): Promise<any> {
  const orgObj = {
    id: oldId || uuid(),
    body: {
      id: `gh_org_${data.id}`,
      githubOrganizationId: data.id,
      name: data.name,
      description: data?.description,
      company: data?.company,
      location: data?.location,
      email: data?.email,
      isVerified: data.is_verified,
      hasOrganizationProjects: data.has_organization_projects,
      hasRepositoryProjects: data.has_repository_projects,
      publicRepos: data.public_repos,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: false,
    },
  };
  return orgObj;
}
