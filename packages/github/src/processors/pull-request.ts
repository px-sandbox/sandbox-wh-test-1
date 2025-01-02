import { Github } from 'abstraction';
import { logger } from 'core';
import moment from 'moment';
import { OctokitResponse } from '@octokit/types';
import { getPullRequestById } from '../lib/get-pull-request';
import { getTimezoneOfUser } from '../lib/get-user-timezone';
import { getWorkingTime } from '../util/timezone-calculation';
import { ghRequest } from '../lib/request-default';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { getOctokitResp } from '../util/octokit-response';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { DataProcessor } from './data-processor';
import { mappingPrefixes } from '../constant/config';

async function getGithubApiToken(orgName: string): Promise<string> {
  const installationAccessToken = await getInstallationAccessToken(orgName);
  return `Bearer ${installationAccessToken.body.token}`;
}
export class PRProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  constructor(
    data: Github.ExternalType.Webhook.PullRequest,
    requestId: string,
    resourceId: string,
    processId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.PullRequest, processId);
    this.validate();
  }

  private async getPrData(): Promise<Github.Type.PullRequestBody | false> {
    const pull = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    logger.info({
      message: 'PRProcessor.setPullObj.info: PULL REQUEST ID',
      data: this.ghApiData.id,
    });
    if (pull) {
      const [pullData] = await getPullRequestById(this.ghApiData.id);
      return pullData;
    }
    return false;
  }

  private updateGhApiData(pullData: Github.Type.PullRequestBody): void {
    if (pullData.reviewedAt) {
      this.ghApiData.reviewed_at = pullData.reviewedAt;
      this.ghApiData.review_seconds = pullData.reviewSeconds;
    }
    if (pullData.approvedAt) {
      this.ghApiData.approved_at = pullData.approvedAt;
    }
  }

  private async updateReviewCommentCount(): Promise<void> {
    const repo = this.ghApiData.head.repo.name;
    const owner = this.ghApiData.head.repo.owner.login;
    const pullNumber = this.ghApiData.number;
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: await getGithubApiToken(owner),
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
    const responseData = (await octokitRequestWithTimeout(
      `GET /repos/${owner}/${repo}/pulls/${pullNumber}`
    )) as OctokitResponse<any>;
    const octokitRespData = getOctokitResp(responseData);
    if (octokitRespData.review_comments) {
      this.ghApiData.review_comments = octokitRespData.review_comments;
    }
  }

  private async setReviewTimeOnReviewSubmitted(
    pullData: Github.Type.PullRequestBody,
    prReviewUser: { id: number; type: string },
    prReviewSubmittedAt: string,
    state: string
  ): Promise<{ approvedAt: string | null; reviewedAt: string | null; reviewSeconds: number }> {
    let { approvedAt, reviewedAt, reviewSeconds } = pullData;
    if (
      !reviewedAt &&
      pullData.pRCreatedBy !== `${mappingPrefixes.user}_${prReviewUser.id}` &&
      prReviewUser.type !== Github.Enums.UserType.BOT
    ) {
      reviewedAt = prReviewSubmittedAt;
      const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
      reviewSeconds = getWorkingTime(
        moment(pullData.createdAt),
        moment(reviewedAt),
        createdTimezone
      );
    }

    if (!approvedAt && state === Github.Enums.ReviewState.APPROVED) {
      approvedAt = prReviewSubmittedAt;
    }
    return { approvedAt, reviewedAt, reviewSeconds };
  }

  private async setClosed(): Promise<void> {
    const pullData = (await this.getPrData()) as Github.Type.PullRequestBody;
    if (pullData.merged === true && pullData.reviewedAt === null) {
      if (this.ghApiData.user.id !== this.ghApiData.merged_by?.id) {
        pullData.reviewedAt = this.ghApiData.merged_at;
        const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
        pullData.reviewSeconds = getWorkingTime(
          moment(this.ghApiData.created_at),
          moment(this.ghApiData.merged_at),
          createdTimezone
        );
      }
    }
    await this.format();
  }

  private async setReviewRequested(): Promise<void> {
    const prExists = await this.getPrData();
    if (prExists) {
      await this.format();
    }
    logger.info({
      message: 'PRProcessor.setReviewRequested.info: PR_NOT_FOUND',
      data: { pr_number: this.ghApiData.number, repo_id: this.ghApiData.head.repo.id },
    });
  }

  private async reviewSubmitted(
    prReviewUser: { id: number; type: string },
    prReviewSubmittedAt: string,
    state: string
  ): Promise<void> {
    const pullData = (await this.getPrData()) as Github.Type.PullRequestBody;
    const { approvedAt, reviewedAt, reviewSeconds } = await this.setReviewTimeOnReviewSubmitted(
      pullData,
      prReviewUser,
      prReviewSubmittedAt,
      state
    );
    this.ghApiData.approved_at = approvedAt;
    this.ghApiData.reviewed_at = reviewedAt;
    this.ghApiData.review_seconds = reviewSeconds;
    await this.format();
  }

  private async format(): Promise<void> {
    const reqReviewersData = this.ghApiData.requested_reviewers.map((reqReviewer) => ({
      userId: `${mappingPrefixes.user}_${reqReviewer.id}`,
    }));
    const labelsData = this.ghApiData.labels.map((label) => ({
      name: label.name,
    }));
    const pullData = (await this.getPrData()) as Github.Type.PullRequestBody;
    if (pullData) {
      this.updateGhApiData(pullData);
    }
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`),
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
        mergedAt: this.ghApiData.merged_at ?? null,
        reviewedAt: this.ghApiData.reviewed_at ?? null,
        approvedAt: this.ghApiData.approved_at ?? null,
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
      },
    };
  }

  public async process(): Promise<void> {
    try {
      switch (this.ghApiData.action) {
        case Github.Enums.PullRequest.ReviewRequested:
          await this.setReviewRequested();
          break;
        case Github.Enums.PullRequest.Closed:
          await this.setClosed();
          break;
        case Github.Enums.PullRequest.ReviewSubmitted:
          if (this.ghApiData.review) {
            await this.updateReviewCommentCount();
            await this.reviewSubmitted(
              this.ghApiData.review.user,
              this.ghApiData.review.submitted_at,
              this.ghApiData.review.state
            );
          } else {
            logger.info({
              message: 'PRProcessor.process.info: no_review_submitted_data',
              data: { pr_number: this.ghApiData.number, reviewData: this.ghApiData.review },
            });
          }
          break;
        case Github.Enums.PullRequest.ReviewCommentedDelete:
          await this.updateReviewCommentCount();
          await this.format();
          break;
        case Github.Enums.PullRequest.ReviewRequestRemoved:
        case Github.Enums.PullRequest.Edited:
        case Github.Enums.PullRequest.Reopened:
        case Github.Enums.PullRequest.Assigned:
        case Github.Enums.PullRequest.Unassigned:
        case Github.Enums.PullRequest.Labeled:
        case Github.Enums.PullRequest.Unlabeled:
        case Github.Enums.PullRequest.ReadyForReview:
        case Github.Enums.PullRequest.Opened:
        case Github.Enums.PullRequest.ConvertedToDraft:
        case Github.Enums.PullRequest.ReviewCommented:
          await this.format();
          break;
        default:
          logger.info({
            message: 'PRProcessor.processor.info: no_pr_action_received',
            data: { pr_number: this.ghApiData.number },
          });
          break;
      }
    } catch (error) {
      logger.error({ message: 'PRProcessor.processor.error', error: `${error}` });
      throw error;
    }
  }
}
