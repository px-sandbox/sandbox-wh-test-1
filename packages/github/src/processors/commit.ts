import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class CommitProcessor extends DataProcessor<
  Github.ExternalType.Webhook.Commits,
  Github.Type.Commits
> {
  constructor(data: Github.ExternalType.Webhook.Commits) {
    super(data);
  }
  async processor(): Promise<Github.Type.Commits> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.branch}_${this.ghApiData.commits.id}`
    );
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: this.ghApiData.commits.id,
        githubCommitId: `${mappingPrefixes.commit}_${this.ghApiData.commits.id}`,
        message: this.ghApiData.commits.message,
        authorId: this.ghApiData.author.id,
        committedAt: this.ghApiData.commits.timestamp,
        changes: [
          {
            filename: this.ghApiData.files[0].filename,
            additions: this.ghApiData.files[0].additions,
            deletions: this.ghApiData.files[0].deletions,
            changes: this.ghApiData.files[0].changes,
            status: this.ghApiData.files[0].status,
          },
        ],
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
