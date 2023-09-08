import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class ActiveBranchProcessor extends DataProcessor<
  Github.Type.RawActiveBRanches,
  Github.Type.ActiveBranches
> {
  constructor(data: Github.Type.RawActiveBRanches) {
    super(data);
  }

  public async processor(): Promise<Github.Type.ActiveBranches> {
    const bodyId = `${mappingPrefixes.branch_count}_${this.ghApiData.repoId}_${this.ghApiData.createdAt}`;

    const parentId: string = await this.getParentId(bodyId);

    return {
      id: parentId || uuid(),
      body: {
        id: bodyId,
        repoId: this.ghApiData.repoId,
        organizationId: this.ghApiData.organizationId,
        createdAt: this.ghApiData.createdAt,
        branchesCount: this.ghApiData.branchesCount,
      },
    };
  }
}
