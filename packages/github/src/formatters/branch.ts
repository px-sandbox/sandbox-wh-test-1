import { Github } from 'abstraction';
import { DataFormatter } from './data-formatter';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from 'src/constant/config';

export class Branch extends DataFormatter<Github.ExternalType.Api.Branch, Github.Type.Branch> {
  constructor(data: Github.ExternalType.Api.Branch) {
    super(data);
  }
  formatter(parentId: string): Github.Type.Branch {
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.branch}_${this.ghApiData.id}`,
        githubBranchId: this.ghApiData.id,
        name: this.ghApiData.name,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.organization_id}`,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repo_id}`,
        createdAt: this.ghApiData?.created_at,
        pushedAt: this.ghApiData?.pushed_at,
        updatedAt: this.ghApiData?.updated_at,
        deletedAt: false,
      },
    };
    return orgObj;
  }
}
