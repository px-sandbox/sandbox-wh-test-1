import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class ActiveBranchProcessor extends DataProcessor<
  Github.Type.RawActiveBRanches,
  Github.Type.ActiveBranches
> {
  constructor(
    data: Github.Type.RawActiveBRanches,
    requestId: string,
    resourceId: string,
    processId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.ActiveBranches, processId);
  }

  public async process(): Promise<void> {
    // active branches is a cron to update the branch count, no cases for switch statement
    await this.format();
  }

  public async format(): Promise<void> {
    this.formattedData = {
      id: await this.parentId(
        `${mappingPrefixes.branch_count}_${this.ghApiData.repoId}_${this.ghApiData.createdAt}`
      ),
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
