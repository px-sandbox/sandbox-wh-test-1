import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class ActiveBranchProcessor extends DataProcessor<any, Github.Type.ActiveBranches> {
  constructor(data: any) {
    super(data);
  }

  public async processor(): Promise<Github.Type.ActiveBranches> {
    return {
      id: uuid(),
      body: {
        id: `${mappingPrefixes.branch_count}_${this.ghApiData.repoId}_${this.ghApiData.createdAt}`,
        repoId: this.ghApiData.repoId,
        organizationId: this.ghApiData.organizationId,
        createdAt: this.ghApiData.createdAt,
        branchesCount: this.ghApiData.branchesCount,
      },
    };
  }
}
