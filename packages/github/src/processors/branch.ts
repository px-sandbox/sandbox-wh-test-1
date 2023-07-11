import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';
import moment from 'moment';

export class BranchProcessor extends DataProcessor<
  Github.ExternalType.Api.Branch,
  Github.Type.Branch
> {
  constructor(data: Github.ExternalType.Api.Branch) {
    super(data);
  }
  async processor(): Promise<Github.Type.Branch> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.branch}_${this.ghApiData.id}`
    );
    const createdAt = this.ghApiData.created_at ?? new Date();
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const branchObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.branch}_${this.ghApiData.id}`,
        githubBranchId: this.ghApiData.id,
        name: this.ghApiData.name ?? this.ghApiData.ref,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repo_id}`,
        createdAt: createdAt,
        pushedAt: this.ghApiData?.pushed_at,
        updatedAt: this.ghApiData?.updated_at,
        deletedAt: this.ghApiData.deleted_at,
        isDeleted: this.ghApiData.deleted_at ? true : false,
        action: action,
        createdAtDay: moment(createdAt).format('dddd'),
        computationalDate: await this.calculateComputationalDate(createdAt),
        githubDate: moment(createdAt).format('YYYY-MM-DD'),
        protected: this.ghApiData?.protected,
      },
    };

    return branchObj;
  }
}
