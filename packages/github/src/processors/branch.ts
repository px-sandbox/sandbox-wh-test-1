import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from 'src/constant/config';
import { Queue } from 'sst/node/queue';
import { DataProcessor } from './data-processor';

export class BranchProcessor extends DataProcessor<
  Github.ExternalType.Api.Branch,
  Github.Type.Branch
> {
  constructor(data: Github.ExternalType.Api.Branch) {
    super(data);
  }
  async processor(): Promise<Github.Type.Branch> {
    const parentId: string = await this.getParentId(`${mappingPrefixes.user}_${this.ghApiData.id}`);
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
