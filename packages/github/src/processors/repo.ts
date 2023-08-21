import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import moment from 'moment';
import { DataProcessor } from './data-processor';

export class RepositoryProcessor extends DataProcessor<
  Github.ExternalType.Api.Repository,
  Github.Type.RepoFormatter
> {
  constructor(data: Github.ExternalType.Api.Repository) {
    super(data);
  }
  async processor(): Promise<Github.Type.RepoFormatter> {
    const parentId: string = await this.getParentId(`${mappingPrefixes.repo}_${this.ghApiData.id}`);
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const repoObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.repo}_${this.ghApiData.id}`,
        githubRepoId: this.ghApiData.id,
        name: this.ghApiData.name,
        description: this.ghApiData?.description,
        isPrivate: this.ghApiData.private,
        owner: this.ghApiData.owner.login,
        visibility: this.ghApiData.visibility,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        openIssuesCount: this.ghApiData.open_issues_count,
        topics: this.ghApiData.topics,
        createdAt: this.ghApiData.created_at,
        pushedAt: this.ghApiData.pushed_at,
        updatedAt: this.ghApiData.updated_at,
        action,
        createdAtDay: moment(this.ghApiData.created_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.created_at),
        githubDate: moment(this.ghApiData.created_at).format('YYYY-MM-DD'),
        isDeleted: this.ghApiData.action == 'deleted' ? true : false,
      },
    };
    return repoObj;
  }
}
