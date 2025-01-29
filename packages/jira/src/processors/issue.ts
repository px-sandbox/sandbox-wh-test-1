/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { ChangelogField, ChangelogStatus, IssuesTypes } from 'abstraction/jira/enums';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import moment from 'moment';
import { getSprintForTo } from '../util/prepare-reopen-rate';
import { getIssueById, updateIssueWithSubtask } from '../repository/issue/get-issue';
import { getIssueStatusForReopenRate } from '../util/issue-status';
import { softDeleteCycleTimeDocument } from '../repository/cycle-time/update';
import { saveIssueDetails } from '../repository/issue/save-issue';
import { removeReopenRate } from '../webhook/issues/delete-reopen-rate';
import { DataProcessor } from './data-processor';
import { getOrganization } from '../repository/organization/get-organization';
import { JiraClient } from '../lib/jira-client';
import { mappingPrefixes } from '../constant/config';

export class IssueProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Issue,
  Jira.Type.Issue
> {
  private sqsClient: SQSClient;
  constructor(
    data: Jira.ExternalType.Webhook.Issue,
    requestId: string,
    resourceId: string,
    retryProcessId: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.Issue, retryProcessId);
    this.sqsClient = SQSClient.getInstance();
  }

  private async getSprintAndBoardId(data: Jira.ExternalType.Webhook.Issue): Promise<{
    sprintId: string | null;
    boardId: string | null;
  }> {
    let sprintId: string | null;
    let boardId: string | null;
    const esbIssueData = await getIssueById(data.issue.id, data.organization, {
      requestId: this.requestId,
    });
    const [sprintChangelog] = !data.changelog
      ? []
      : data.changelog.items.filter(
          (item) =>
            item.fieldId === ChangelogField.SPRINT || item.fieldId === ChangelogField.CUSTOM_FIELD
        );
    if (sprintChangelog) {
      const changelogSprintId = getSprintForTo(sprintChangelog.to, sprintChangelog.from);
      sprintId = changelogSprintId ? `${mappingPrefixes.sprint}_${changelogSprintId}` : null;
    } else if (esbIssueData?.sprintId) {
      sprintId = esbIssueData.sprintId;
    } else {
      const customFieldSprintId = data.issue.fields.customfield_10007?.[0]?.id ?? null;
      sprintId = customFieldSprintId ? `${mappingPrefixes.sprint}_${customFieldSprintId}` : null;
    }

    if (data.issue.fields.customfield_10007) {
      const item = data.issue.fields.customfield_10007.find(
        (items) => `${mappingPrefixes.sprint}_${items.id}` === sprintId
      );
      boardId = item ? `${mappingPrefixes.board}_${item.boardId}` : null;
    } else if (sprintId === null) {
      boardId = null;
    } else if (esbIssueData?.boardId) {
      boardId = esbIssueData.boardId;
    } else {
      boardId = null;
    }
    if (boardId === null) {
      logger.info({
        message: 'sprint_board_data_for_issue',
        data: JSON.stringify({
          sprintChangelog,
          customfield_10007: data.issue.fields.customfield_10007,
        }),
        requestId: this.requestId,
        resourceId: this.resourceId,
      });
    }
    return {
      sprintId: sprintId ?? null,
      boardId: boardId ?? null,
    };
  }

  private async delete(): Promise<void> {
    const issueData = await getIssueById(this.apiData.issue.id, this.apiData.organization, {
      requestId: this.requestId,
      resourceId: this.apiData.issue.id,
    });
    if (!issueData) {
      logger.info({
        requestId: this.requestId,
        resourceId: this.apiData.issue.id,
        message: 'issueDeletedEvent: Issue not found',
      });
      return;
    }
    const { _id, ...processIssue } = issueData;
    processIssue.isDeleted = true;
    processIssue.deletedAt = moment(this.apiData.timestamp).toISOString();

    logger.info({
      requestId: this.requestId,
      resourceId: this.apiData.issue.id,
      message: `issueDeletedEvent: Delete Issue id ${_id}`,
    });
    await saveIssueDetails({ id: _id, body: processIssue } as Jira.Type.Issue, {
      requestId: this.requestId,
      resourceId: this.apiData.issue.id,
    });

    // soft delete cycle time document
    await softDeleteCycleTimeDocument(
      this.apiData.issue.id,
      issueData.issueType,
      this.apiData.organization,
      this.apiData.issue.fields.parent.id
    );
    // remove reopen rate
    await removeReopenRate(
      {
        issue: this.apiData.issue,
        changelog: this.apiData.changelog,
        organization: this.apiData.organization,
      } as Jira.Mapped.ReopenRateIssue,
      this.apiData.timestamp,
      this.requestId
    );
  }

  public async process(): Promise<void> {
    try {
      switch (this.apiData.eventName) {
        case Jira.Enums.Event.IssueCreated:
        case Jira.Enums.Event.WorklogCreated:
        case Jira.Enums.Event.WorklogUpdated:
        case Jira.Enums.Event.WorklogDeleted:
          await this.format();
          break;
        case Jira.Enums.Event.IssueUpdated:
          await this.updateReopenRate();
          await this.format();
          break;
        case Jira.Enums.Event.IssueDeleted:
          await this.delete();
          break;
        default:
          logger.error({
            requestId: this.requestId,
            resourceId: this.resourceId,
            message: 'issueFormattedDataReceiver.no_case_found',
          });
      }
    } catch (error) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: 'issueFormattedDataReceiver.error',
        error: `${error}`,
      });
    }
  }

  private async updateReopenRate(): Promise<void> {
    if (this.apiData.issue.fields.issuetype.name !== IssuesTypes.BUG) {
      return;
    }
    const orgData = await getOrganization(this.apiData.organization);
    const issueState = this.apiData.changelog.items[0];
    if (orgData) {
      const issueStatus = await getIssueStatusForReopenRate(orgData.id, {
        requestId: this.requestId,
        resourceId: this.resourceId,
      });
      if (
        [
          issueStatus[ChangelogStatus.READY_FOR_QA],
          issueStatus[ChangelogStatus.QA_FAILED],
        ].includes(issueState.to)
      ) {
        logger.info({
          requestId: this.requestId,
          resourceId: this.resourceId,
          message: 'issue_info_ready_for_QA_update_event: Send message to SQS',
        });
        const typeOfChangelog =
          issueStatus[ChangelogStatus.READY_FOR_QA] === issueState.to
            ? ChangelogStatus.READY_FOR_QA
            : ChangelogStatus.QA_FAILED;

        await this.sqsClient.sendMessage(
          { ...this.apiData, typeOfChangelog },
          Queue.qReOpenRate.queueUrl,
          {
            requestId: this.requestId,
            resourceId: this.resourceId,
          }
        );
      }
    }
  }
  // eslint-disable-next-line complexity
  public async format(): Promise<void> {
    const orgData = await getOrganization(this.apiData.organization);
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const issueDataFromApi = await jiraClient.getIssue(this.apiData.issue.id);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.apiData.organization} not found`,
      });
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }

    // sending parent issue to issue format queue so that it gets updated along with it's subtasks
    if (this.apiData.issue.fields?.parent) {
      /**
       * update in elasticsearch for parent issue for subtask data
       * if no document for parent then log error
       * update subtask array in parent document
       * */
      const parent = this.apiData.issue.fields?.parent;
      try {
        const parentIssueData = await jiraClient.getIssue(parent.key);
        const esbParentData = await getIssueById(parent.id, this.apiData.organization, {
          requestId: this.requestId,
        });
        if (esbParentData) {
          await updateIssueWithSubtask(esbParentData._id, parentIssueData.fields.subtasks);
        } else {
          logger.error({
            requestId: this.requestId,
            resourceId: this.resourceId,
            message: `issue.processor.parent_issue_not_found_in_esb`,
            data: { parentIssueId: parent.id, parentIssueKey: parent.key },
          });
        }
      } catch (error) {
        logger.error({
          requestId: this.requestId,
          resourceId: this.resourceId,
          message: 'issue.processor.error.getting_parent_issue',
          error: `${error}`,
        });
      }
    }

    const fnRca = (): {
      containsQARca: boolean;
      containsDevRca: boolean;
      rcaData: { devRca: string | null; qaRca: string | null };
    } => {
      const containingQARca = issueDataFromApi.fields.customfield_11226;
      const containingDevRca = issueDataFromApi.fields.customfield_11225;
      const devRca = issueDataFromApi.fields.customfield_11225?.id;
      const qaRca = issueDataFromApi.fields.customfield_11226?.id;
      return {
        containsDevRca: !!containingDevRca,
        containsQARca: !!containingQARca,
        rcaData: {
          devRca: devRca ? `${mappingPrefixes.rca}_${devRca}` : null,
          qaRca: qaRca ? `${mappingPrefixes.rca}_${qaRca}` : null,
        },
      };
    };

    this.formattedData = {
      id: await this.parentId(
        `${mappingPrefixes.issue}_${this.apiData.issue.id}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        id: `${mappingPrefixes.issue}_${this.apiData.issue.id}`,
        issueId: this.apiData.issue.id,
        projectKey: this.apiData.issue.fields.project.key,
        projectId: `${mappingPrefixes.project}_${this.apiData.issue.fields.project.id}`,
        issueKey: this.apiData.issue.key,
        isFTP: issueDataFromApi.fields.labels?.includes('FTP') ?? false,
        isFTF: issueDataFromApi.fields.labels?.includes('FTF') ?? false,
        issueType: this.apiData.issue.fields.issuetype.name,
        isPrimary: true,
        ...fnRca(),
        priority: this.apiData.issue.fields.priority.name,
        label: issueDataFromApi.fields.labels,
        summary: issueDataFromApi?.fields?.summary ?? '',
        issueLinks: issueDataFromApi.fields.issuelinks,
        assigneeId: this.apiData.issue.fields.assignee?.accountId
          ? `${mappingPrefixes.user}_${this.apiData.issue.fields.assignee.accountId}`
          : null,
        reporterId: this.apiData.issue.fields.reporter?.accountId
          ? `${mappingPrefixes.user}_${this.apiData.issue.fields.reporter.accountId}`
          : null,
        creatorId: this.apiData.issue.fields.creator?.accountId
          ? `${mappingPrefixes.user}_${this.apiData.issue.fields.creator.accountId}`
          : null,
        status: this.apiData.issue.fields.status.name,
        subtasks: issueDataFromApi.fields.subtasks ?? [],
        createdDate: this.apiData.issue.fields.created,
        lastUpdated: this.apiData.issue.fields.updated,
        lastViewed: this.apiData.issue.fields.lastViewed,
        ...(await this.getSprintAndBoardId(this.apiData)),
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.id,
        timeTracker: {
          estimate: issueDataFromApi?.fields?.timetracking?.originalEstimateSeconds ?? 0,
          actual: issueDataFromApi?.fields?.timetracking?.timeSpentSeconds ?? 0,
        },
      },
    };
  }
}
