import { Github } from 'abstraction';
import { logger } from 'core';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessorOld } from './data-processor-old';

export class PRProcessor extends DataProcessorOld<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  constructor(
    data: Github.ExternalType.Webhook.PullRequest,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId);
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
      id: parentId,
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
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.head.repo.owner.id}`,
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
    logger.info({
      message: 'PRProcessor.setPullObj.info: PULL REQUEST ID : ',
      data: this.ghApiData.id,
    });
    if (pull) {
      return true;
    }
    return false;
  }

  // eslint-disable-next-line complexity
  private async processPRAction(): Promise<void> {
    switch (this.ghApiData.action) {
      case Github.Enums.PullRequest.ReviewRequested:
      case Github.Enums.PullRequest.ReviewRequestRemoved:
      case Github.Enums.PullRequest.Edited:
      case Github.Enums.PullRequest.Reopened:
      case Github.Enums.PullRequest.Assigned:
      case Github.Enums.PullRequest.Unassigned:
      case Github.Enums.PullRequest.Labeled:
      case Github.Enums.PullRequest.Unlabeled:
      case Github.Enums.PullRequest.Locked:
      case Github.Enums.PullRequest.Unlocked:
      case Github.Enums.PullRequest.ReadyForReview:
      case Github.Enums.PullRequest.Demilestoned:
      case Github.Enums.PullRequest.Milestoned:
      case Github.Enums.PullRequest.ConvertedToDraft:
      case Github.Enums.PullRequest.AutoMergeEnabled:
      case Github.Enums.PullRequest.AutoMergeDisabled:
      case Github.Enums.PullRequest.Synchronize:
      case Github.Enums.PullRequest.Dequeued:
      case Github.Enums.PullRequest.Enqueued:
      case Github.Enums.PullRequest.Closed:
        {
          const pr = await this.isPRExist();
          if (!pr) {
            logger.error({
              message: 'PRProcessor.processPRAction.error PR_NOT_FOUND',
              data: this.ghApiData.id,
            });
            throw new Error('PR_NOT_FOUND');
          }
        }
        break;
      default:
        logger.info({
          message: 'PRProcessor.processPRAction.info: PROCESS_NEW_PR',
          data: this.ghApiData.id,
        });
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
    try {
      await this.processPRAction();
      const githubId = `${mappingPrefixes.pull}_${this.ghApiData.id}`;
      let parentId = await this.getParentId(githubId);
      if (!parentId && this.ghApiData.action !== Github.Enums.PullRequest.Opened) {
        throw new Error(
          `PRProcessor.pr_not_found_for_event.error: id:${this.ghApiData.id}, 
          repoId:${this.ghApiData.head.repo.id}, 
          action:${this.ghApiData.action}`
        );
      }
      if (!parentId) {
        parentId = uuid();
        await this.putDataToDynamoDB(parentId, githubId);
      }
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
    } catch (error) {
      logger.error({ message: 'PRProcessor.processor.error', error: `${error}` });
      throw error;
    }
  }
}
