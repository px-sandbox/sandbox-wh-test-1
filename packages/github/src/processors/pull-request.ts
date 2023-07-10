import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logger } from 'core';

export class PRProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  constructor(data: Github.ExternalType.Webhook.PullRequest) {
    super(data);
  }
  async processor(): Promise<Github.Type.PullRequest> {
    if (
      this.ghApiData.action === Github.Enums.PullRequest.Closed &&
      this.ghApiData.merged === true
    ) {
      const commitParentId = await this.getParentId(
        `${mappingPrefixes.commit}_${this.ghApiData.merged_commit_sha}`
      );

      if (commitParentId) {
        await new SQSClient().sendMessage(
          {
            commitId: this.ghApiData.merged_commit_sha,
            isMergedCommit: this.ghApiData.merged,
            mergedBranch: this.ghApiData.base.ref,
            pushedBranch: this.ghApiData.head.ref,
            repository: {
              id: this.ghApiData.head.repo.id,
              name: this.ghApiData.head.repo.name,
              owner: this.ghApiData.head.repo.owner.login,
            },
          },
          Queue.gh_commit_format.queueUrl
        );
      } else {
        const attemptNo = this.ghApiData.attempt + 1;
        if (attemptNo > 5) {
          logger.error('MERGE_COMMIT_NOT_FOUND', this.ghApiData);
          throw new Error('ATTEMPT EXCEED : MERGE_COMMIT_NOT_FOUND');
        }
        console.log('No. of Attempt to find Merged commit:', attemptNo);
        this.ghApiData.attempt = attemptNo;
        const data = this.ghApiData;
        await new SQSClient().sendMessage(data, Queue.gh_pr_format.queueUrl, 3);
      }
    }
    const parentId: string = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    const reqReviewersData: Array<Github.Type.RequestedReviewers> = [];
    this.ghApiData.requested_reviewers.map((reqReviewer) => {
      reqReviewersData.push({
        userId: `${mappingPrefixes.user}_${reqReviewer.id}`,
      });
    });

    const labelsData: Array<Github.Type.Labels> = [];
    this.ghApiData.labels.map((label) => {
      labelsData.push({
        name: label.name,
      });
    });
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
      },
    ];
    const pullObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.pull}_${this.ghApiData.id}`,
        githubPullId: this.ghApiData.id,
        pullNumber: this.ghApiData.number,
        state: this.ghApiData.state,
        title: this.ghApiData.title,
        pRCreatedBy: `${mappingPrefixes.user}_${this.ghApiData.user.id}`,
        pullBody: this.ghApiData.body,
        createdAt: this.ghApiData.created_at,
        updatedAt: this.ghApiData.updated_at,
        closedAt: this.ghApiData.closed_at,
        mergedAt: this.ghApiData.merged_at,
        reviewedAt: this.ghApiData.reviewed_at,
        approvedAt: this.ghApiData.approved_at,
        requestedReviewers: reqReviewersData,
        labels: labelsData,
        head: {
          label: this.ghApiData.head.label,
          ref: this.ghApiData.head.ref,
        },
        base: {
          label: this.ghApiData.base.label,
          ref: this.ghApiData.base.ref,
        },
        mergedBy: this.ghApiData.merged_by
          ? { userId: `${mappingPrefixes.user}_${this.ghApiData.merged_by.id}` }
          : null,
        merged: this.ghApiData.merged,
        mergedCommitId: this.ghApiData.merged_commit_sha
          ? `${mappingPrefixes.commit}_${this.ghApiData.merged_commit_sha}`
          : null,
        comments: this.ghApiData.comments,
        reviewComments: this.ghApiData.review_comments,
        commits: this.ghApiData.commits,
        additions: this.ghApiData.additions,
        deletions: this.ghApiData.deletions,
        changedFiles: this.ghApiData.changed_files,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.head.repo.id}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        action: action,
      },
    };
    return pullObj;
  }
}
