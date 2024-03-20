import { Github } from 'abstraction';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class BranchProcessor extends DataProcessor<
  Github.ExternalType.Api.Branch,
  Github.Type.Branch
> {
  constructor(data: Github.ExternalType.Api.Branch) {
    super(data);
  }
  public async processor(): Promise<Github.Type.Branch> {
    let parentId: string = await this.getParentId(`${mappingPrefixes.branch}_${this.ghApiData.id}`);
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, `${mappingPrefixes.branch}_${this.ghApiData.id}`);
    }
    const createdAt = this.ghApiData.created_at ?? new Date();
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const branchObj = {
      id: parentId,
      body: {
        id: `${mappingPrefixes.branch}_${this.ghApiData.id}`,
        githubBranchId: this.ghApiData.id,
        name: this.ghApiData.name ?? this.ghApiData.ref,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repo_id}`,
        createdAt,
        pushedAt: this.ghApiData?.pushed_at,
        updatedAt: this.ghApiData?.updated_at,
        deletedAt: this.ghApiData.deleted_at,
        isDeleted: !!this.ghApiData.deleted_at,
        action,
        createdAtDay: moment(createdAt).format('dddd'),
        computationalDate: await this.calculateComputationalDate(createdAt),
        githubDate: moment(createdAt).format('YYYY-MM-DD'),
        protected: this.ghApiData?.protected || false,
      },
    };

    return branchObj;
  }
}
