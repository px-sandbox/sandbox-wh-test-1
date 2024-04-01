import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class Organization extends DataProcessor<
  Github.ExternalType.Api.Organization,
  Github.Type.Organization
> {
  constructor(data: Github.ExternalType.Api.Organization) {
    super(data);
  }
  public async processor(): Promise<Github.Type.Organization> {
    const githubId = `${mappingPrefixes.organization}_${this.ghApiData.id}`;
    let parentId: string = await this.getParentId(githubId);
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, githubId);
    }
    const orgObj = {
      id: parentId,
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
      },
    };
    return orgObj;
  }
}
