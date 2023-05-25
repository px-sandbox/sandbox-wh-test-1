import { Github } from 'abstraction';
import { DataFormatter } from './data-formatter';
import { v4 as uuid } from 'uuid';
import { GIT_ORGANIZATION_ID, mappingPrefixes } from 'src/constant/config';

export class Repo extends DataFormatter<
  Github.ExternalType.Api.Repository,
  Github.Type.RepoFormatter
> {
  constructor(data: Github.ExternalType.Api.Repository) {
    super(data);
  }
  formatter(parentId: string): Github.Type.RepoFormatter {
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
        organizationId: `${mappingPrefixes.organization}_${GIT_ORGANIZATION_ID}`,
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
