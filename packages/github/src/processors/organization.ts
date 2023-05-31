import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class Organization extends DataProcessor<
  Github.ExternalType.Api.Organization,
  Github.Type.Organization
> {
  constructor(data: Github.ExternalType.Api.Organization) {
    super(data);
  }
  async processor(): Promise<Github.Type.Organization> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.organization}_${this.ghApiData.id}`
    );
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.organization}_${this.ghApiData.id}`,
        githubOrganizationId: this.ghApiData.id,
        name: this.ghApiData.login,
        description: this.ghApiData?.description,
        company: this.ghApiData?.company,
        location: this.ghApiData?.location,
        email: this.ghApiData?.email,
        isVerified: this.ghApiData.is_verified,
        hasOrganizationProjects: this.ghApiData.has_organization_projects,
        hasRepositoryProjects: this.ghApiData.has_repository_projects,
        publicRepos: this.ghApiData.public_repos,
        createdAt: this.ghApiData.created_at,
        updatedAt: this.ghApiData.updated_at,
        deletedAt: false,
      },
    };
    return orgObj;
  }
}
