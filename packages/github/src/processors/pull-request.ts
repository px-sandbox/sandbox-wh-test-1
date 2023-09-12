import moment from 'moment';
import { Github } from 'abstraction';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class PRProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  constructor(data: Github.ExternalType.Webhook.PullRequest) {
    super(data);
  }

  private setAction(): Github.Type.actions {
    return [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
  }

  private async setPullObj(
    parentId: string,
    reqReviewersData: Array<Github.Type.RequestedReviewers>,
    labelsData: Array<Github.Type.Labels>,
    action: Github.Type.actions
  ): Promise<Github.Type.PullRequest> {
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
        reviewSeconds: this.ghApiData.review_seconds ? this.ghApiData.review_seconds : 0,
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
        mergedCommitId: this.ghApiData.merge_commit_sha
          ? `${mappingPrefixes.commit}_${this.ghApiData.merge_commit_sha}`
          : null,
        comments: this.ghApiData.comments,
        reviewComments: this.ghApiData.review_comments,
        commits: this.ghApiData.commits,
        additions: this.ghApiData.additions,
        deletions: this.ghApiData.deletions,
        changedFiles: this.ghApiData.changed_files,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.head.repo.id}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        action,
        createdAtDay: moment(this.ghApiData.created_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.created_at),
        githubDate: moment(this.ghApiData.created_at).format('YYYY-MM-DD'),
      },
    };
    return pullObj;
  }
  private async isPRExist(): Promise<boolean> {
    const pull = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    logger.info('PULL REQUEST ID : ', this.ghApiData.id);
    if (pull) {
      return true;
    }
    return false;
  }

  private async processPRAction(): Promise<void> {
    switch (this.ghApiData.action) {
      case Github.Enums.PullRequest.ReviewRequested:
      case Github.Enums.PullRequest.ReviewRequestRemoved:
      case Github.Enums.PullRequest.Edited:
      case Github.Enums.PullRequest.Reopened:
      case Github.Enums.PullRequest.Labeled:
      case Github.Enums.PullRequest.Unlabeled:
      case Github.Enums.PullRequest.Closed:
        {
          const pr = await this.isPRExist();
          if (!pr) {
            logger.info('PR_NOT_FOUND', this.ghApiData.id);
            throw new Error('PR_NOT_FOUND');
          }
        }
        break;
      default:
        logger.info('PROCESS_NEW_PR', this.ghApiData.id);
        break;
    }
  }

  /**
   * ----------------------------------------------------------
   * PULL REQUEST PROCESSOR
   * ----------------------------------------------------------
   * On PR closed check if the PR is merged or not.
   * If merged then check merged commit id exists or not.
   * If not exists then hold for few seconds and check again.
   * If not found commit id till 6th attempt then throw error.
   * If commit id exists then update commit and proceed with PR.
   */
  public async processor(): Promise<Github.Type.PullRequest> {
    await this.processPRAction();
    if (
      this.ghApiData.action === Github.Enums.PullRequest.Closed &&
      this.ghApiData.merged === true
    ) {
      logger.info('PROCESS_MERGED_PR', this.ghApiData);
      await new SQSClient().sendMessage(
        {
          commitId: this.ghApiData.merge_commit_sha,
          isMergedCommit: this.ghApiData.merged,
          mergedBranch: this.ghApiData.base.ref,
          pushedBranch: this.ghApiData.head.ref,
          repository: {
            id: this.ghApiData.head.repo.id,
            name: this.ghApiData.head.repo.name,
            owner: this.ghApiData.head.repo.owner.login,
          },
        },
        Queue.gh_merge_commit_process.queueUrl
      );
    }

    const parentId: string = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    const reqReviewersData: Array<Github.Type.RequestedReviewers> =
      this.ghApiData.requested_reviewers.map((reqReviewer) => ({
        userId: `${mappingPrefixes.user}_${reqReviewer.id}`,
      }));

    const labelsData: Array<Github.Type.Labels> = this.ghApiData.labels.map((label) => ({
      name: label.name,
    }));
    const action = this.setAction();
    const pullObj = await this.setPullObj(parentId, reqReviewersData, labelsData, action);
    return pullObj;
  }
}
