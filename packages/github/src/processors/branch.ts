import { Github } from 'abstraction';
import moment from 'moment';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class BranchProcessor extends DataProcessor<
  Github.ExternalType.Api.Branch,
  Github.Type.Branch
> {
  constructor(
    private action: string,
    data: Github.ExternalType.Api.Branch,
    processId: string,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.Branch, processId);
    this.validate();
  }

  public async process(): Promise<void> {
    switch (this.action.toLowerCase()) {
      case Github.Enums.Branch.Created:
        await this.format(false);
        break;
      case Github.Enums.Branch.Deleted:
        await this.format(true);
        break;
      default:
        throw new Error(`Invalid action type ${this.action}`);
    }
  }

  private async format(isDeleted: boolean): Promise<void> {
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.branch}_${this.ghApiData.id}`),
      body: {
        id: `${mappingPrefixes.branch}_${this.ghApiData.id}`,
        githubBranchId: this.ghApiData.id,
        name: this.ghApiData.name ?? this.ghApiData.ref,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.orgId}`,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repo_id}`,
        createdAt: this.ghApiData.created_at ?? new Date(),
        pushedAt: this.ghApiData?.pushed_at,
        updatedAt: this.ghApiData?.updated_at,
        deletedAt: isDeleted ? new Date().toISOString() : null,
        isDeleted,
        action: [
          {
            action: this.action ?? 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment(this.ghApiData.created_at ?? new Date()).format('dddd'),
        computationalDate: await this.calculateComputationalDate(
          this.ghApiData.created_at ?? new Date()
        ),
        githubDate: moment(this.ghApiData.created_at ?? new Date()).format('YYYY-MM-DD'),
        protected: this.ghApiData?.protected || false,
      },
    };
  }
}
