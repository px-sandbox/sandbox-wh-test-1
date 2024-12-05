import { Github } from 'abstraction';
import moment from 'moment';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class RepositoryProcessor extends DataProcessor<
  Github.ExternalType.Api.Repository,
  Github.Type.RepoFormatter
> {
  constructor(
    private action: string,
    data: Github.ExternalType.Api.Repository,
    requestId: string,
    resourceId: string,
    processId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.Repo, processId);
    this.validate();
  }

  public async process(): Promise<void> {
    switch (this.action.toLowerCase()) {
      case Github.Enums.Repo.Created:
      case Github.Enums.Repo.Edited:
      case Github.Enums.Repo.Renamed:
      case Github.Enums.Repo.Transferred:
      case Github.Enums.Repo.Privatized:
      case Github.Enums.Repo.Unarchived:
        await this.format(false);
        break;
      case Github.Enums.Repo.Deleted:
      case Github.Enums.Repo.Archived:
        await this.format(true);
        break;
      default:
        throw new Error(`Invalid action type ${this.action}`);
    }
  }

  public async format(isDeleted: boolean): Promise<void> {
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.repo}_${this.ghApiData.id}`),
      body: {
        id: `${mappingPrefixes.repo}_${this.ghApiData.id}`,
        githubRepoId: this.ghApiData.id,
        name: this.ghApiData.name,
        description: this.ghApiData?.description,
        isPrivate: this.ghApiData.private,
        owner: this.ghApiData.owner.login,
        visibility: this.ghApiData.visibility,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.owner.id}`,
        openIssuesCount: this.ghApiData.open_issues_count,
        topics: this.ghApiData.topics,
        createdAt: this.ghApiData.created_at,
        pushedAt: this.ghApiData.pushed_at,
        updatedAt: this.ghApiData.updated_at,
        action: [
          {
            action: this.ghApiData.action ?? 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment(this.ghApiData.created_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.created_at),
        githubDate: moment(this.ghApiData.created_at).format('YYYY-MM-DD'),
        isDeleted,
      },
    };
  }
}
