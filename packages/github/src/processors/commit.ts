import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class CommitProcessor extends DataProcessor<
  Github.ExternalType.Api.Commit,
  Github.Type.Commits
> {
  constructor(data: Github.ExternalType.Api.Commit) {
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
        message: this.ghApiData.commit.message,
        authorId: `${mappingPrefixes.user}_${this.ghApiData.committer.id}`,
        committedAt: this.ghApiData.commits.timestamp,
        changes: filesArr,
        totalChanges: this.ghApiData.stats.total,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        createdAt: this.ghApiData.commit.committer.date,
      },
    };
    return orgObj;
  }
}
