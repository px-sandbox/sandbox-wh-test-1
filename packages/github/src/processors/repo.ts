import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class RepositoryProcessor extends DataProcessor<
  Github.ExternalType.Api.Repository,
  Github.Type.RepoFormatter
> {
  constructor(data: Github.ExternalType.Api.Repository) {
    super(data);
  }
  async processor(): Promise<Github.Type.RepoFormatter> {
    const parentId: string = await this.getParentId(`${mappingPrefixes.repo}_${this.ghApiData.id}`);
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.repo}_${this.ghApiData.id}`,
        githubRepoId: this.ghApiData.id,
        name: this.ghApiData.name,
        description: this.ghApiData?.description,
        isPrivate: this.ghApiData.private,
        owner: this.ghApiData.owner.login,
        visibility: this.ghApiData.visibility,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        openIssuesCount: this.ghApiData.open_issues_count,
        createdAt: this.ghApiData.created_at,
        pushedAt: this.ghApiData.pushed_at,
        updatedAt: this.ghApiData.updated_at,
        deletedAt: false,
      },
    };
    return orgObj;
  }
}
