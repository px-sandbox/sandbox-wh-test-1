import { Github } from 'abstraction';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class CommitProcessor extends DataProcessor<
  Github.ExternalType.Api.Commit,
  Github.Type.Commits
> {
  constructor(data: Github.ExternalType.Api.Commit) {
    super(data);
  }
  public async processor(): Promise<Github.Type.Commits> {
    let parentId = await this.getParentId(`${mappingPrefixes.commit}_${this.ghApiData.commits.id}`);
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(
        parentId,
        `${mappingPrefixes.commit}_${this.ghApiData.commits.id}`
      );
    }

    const filesArr: Array<Github.Type.CommitedFiles> = this.ghApiData.files.map(
      (data: Github.Type.CommitedFiles) => ({
        filename: data.filename,
        additions: data.additions,
        changes: data.changes,
        deletions: data.deletions,
        status: data.status,
      })
    );
    const orgObj = {
      id: parentId,
      body: {
        id: `${mappingPrefixes.commit}_${this.ghApiData.commits.id}`,
        githubCommitId: this.ghApiData.commits.id,
        isMergedCommit: this.ghApiData.commits.isMergedCommit,
        pushedBranch: this.ghApiData.commits.pushedBranch,
        mergedBranch: this.ghApiData.commits.mergedBranch,
        message: this.ghApiData.commit.message,
        authorId: this.ghApiData.author
          ? `${mappingPrefixes.user}_${this.ghApiData.author.id}`
          : null,
        committedAt: this.ghApiData.commits.timestamp,
        changes: filesArr,
        totalChanges: this.ghApiData.stats.total,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.commits.orgId}`,
        createdAt: this.ghApiData.commit.committer.date,
        createdAtDay: moment(this.ghApiData.commit.committer.date).format('dddd'),
        computationalDate: await this.calculateComputationalDate(
          this.ghApiData.commit.committer.date
        ),
        githubDate: moment(this.ghApiData.commit.committer.date).format('YYYY-MM-DD'),
      },
    };
    return orgObj;
  }
}
