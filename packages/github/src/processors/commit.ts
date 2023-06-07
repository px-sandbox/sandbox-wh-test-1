import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class CommitProcessor extends DataProcessor<
  Github.ExternalType.Webhook.Commit,
  Github.Type.Commits
> {
  constructor(data: Github.ExternalType.Webhook.Commit) {
    super(data);
  }
  async processor(): Promise<Github.Type.Commits> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.commit}_${this.ghApiData.commits.id}`
    );
    const filesArr: Array<Github.Type.CommitedFiles> = [];
    this.ghApiData.files.map((data: Github.Type.CommitedFiles) => {
      filesArr.push({
        filename: data.filename,
        additions: data.additions,
        changes: data.changes,
        deletions: data.deletions,
        status: data.status,
      });
    });
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.commit}_${this.ghApiData.commits.id}`,
        githubCommitId: `${this.ghApiData.commits.id}`,
        message: this.ghApiData.commits.message,
        authorId: this.ghApiData.author.id,
        committedAt: this.ghApiData.commits.timestamp,
        changes: filesArr,
        totalChanges: this.ghApiData.stats.total,
        repoId: this.ghApiData.repoId,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        createdAt: '',
        deletedAt: false,
      },
    };

    return orgObj;
  }
}
