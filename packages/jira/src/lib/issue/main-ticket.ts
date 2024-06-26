import { ChangelogField, IssuesTypes } from 'abstraction/jira/enums';
import { Subtasks } from 'abstraction/jira/external/api';
import moment from 'moment';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { SubTicket } from './sub-ticket';
import { calculateTimeDifference } from '../../util/cycle-time';
import { mappingPrefixes } from 'src/constant/config';

export class MainTicket {
  public issueId: string;
  public sprintId: string;
  public subtasks: Subtasks[];
  public orgId: string;
  public projectId: string;
  public issueKey: string;
  public projectKey: string;
  public development: {
    coding: number;
    pickup: number;
    review: number;
    handover: number;
    total: number;
  };
  public qa: { pickup: number; testing: number; total: number };
  public deployment: { total: number };
  public assignees: {
    assigneeId: string;
    name: string;
  }[];
  public history: { status: string; eventTime: string }[];
  public title: string;
  public issueType: string;
  public isDeleted: boolean;
  public deletedAt: string;

  constructor(
    data: Jira.Type.MainTicket,
    private Status: Record<string, number>,
    private StatusMapping: Record<string, { label: string; id: number }>
  ) {
    this.issueId = data.issueId;
    this.sprintId = data.sprintId;
    this.subtasks = data.subtasks ?? [];
    this.orgId = data.organizationId;
    this.projectId = data.projectId;
    this.issueKey = data.issueKey;
    this.projectKey = data.projectKey;
    this.deployment = data.deployment ?? { total: 0 };
    this.qa = data.qa ?? { pickup: 0, testing: 0, total: 0 };
    this.development = data.development ?? {
      coding: 0,
      pickup: 0,
      review: 0,
      handover: 0,
      total: 0,
    };
    this.assignees = data.assignees ?? [];
    this.history = data.history ?? [];
    this.title = data.title;
    this.issueType = data.issueType;
    this.deletedAt = data.deletedAt ?? '';
    this.isDeleted = data.isDeleted ?? false;
  }

  private updateHistory(toStatus: string, timestamp: string): void {
    this.history.push({ status: toStatus, eventTime: timestamp });
  }

  public addSubtask(subtask: Subtasks): void {
    if (this.subtasks.length > 0) {
      const subtaskId = this.subtasks.filter(
        (data: Jira.ExternalType.Api.Subtasks) => data.issueId == subtask.issueId
      );
      if (subtaskId.length > 0) {
        logger.info({ message: 'Subtask already exists', data: subtask.issueId });
        return;
      }
    }
    this.subtasks.push(subtask);
  }

  public addAssignee(assignee: { assigneeId: string; name: string }): void {
    if (this.assignees.length > 0) {
      const assigneeId = this.assignees.filter(
        (data: { assigneeId: string; name: string }) => data.assigneeId === assignee.assigneeId
      );
      if (assigneeId.length > 0) {
        logger.info({ message: 'assignee already exists', data: assignee.assigneeId });
        return;
      }
    }
    this.assignees.push(assignee);
  }

  public async changelog(changelogs: any): Promise<void> {
    const [items] = changelogs.items.filter(
      (item: Jira.ExternalType.Webhook.ChangelogItem) =>
        item.fieldId === ChangelogField.STATUS ||
        item.field === ChangelogField.SPRINT ||
        item.field === ChangelogField.ASSIGNEE
    );

    if (items && items.field === ChangelogField.CUSTOM_FIELD) {
      this.sprintId = `${mappingPrefixes.sprint}_${items.to}`;
    }
    if (items) {
      const statuses = [
        this.Status.To_Do,
        this.Status.In_Progress,
        this.Status.Ready_For_Review,
        this.Status.Code_Review,
        this.Status.Dev_Complete,
        this.Status.Done,
      ];
      if (
        [IssuesTypes.STORY, IssuesTypes.TASK, IssuesTypes.BUG].includes(
          changelogs.issuetype as IssuesTypes
        )
      ) {
        if (items.field === ChangelogField.ASSIGNEE) {
          const assignee = { assigneeId: items.to, name: items.toString };
          this.addAssignee(assignee);
        }
        if (items.fieldId === ChangelogField.STATUS) {
          if (
            items.to === this.StatusMapping[this.Status.Done].id &&
            changelogs.issuetype !== IssuesTypes.SUBTASK
          ) {
            this.statusTransition(items.to, changelogs.timestamp);
          } else if (this.subtasks.length > 0 && statuses.includes(items.to)) {
            const toStatus = this.StatusMapping[items.to].label;
            this.updateHistory(toStatus, changelogs.timestamp);
          } else if (
            items.to === this.StatusMapping[this.Status.Ready_For_QA].id &&
            this.subtasks.length > 0
          ) {
            const toStatus = this.StatusMapping[items.to].label;
            this.updateHistory(toStatus, changelogs.timestamp);
          } else {
            this.statusTransition(items.to, changelogs.timestamp);
          }
        }
      }
      this.subtasks = this.subtasks.map((subtask, i) => {
        if (changelogs.issueId === this.subtasks[i].issueId && subtask.isDeleted === false) {
          const updatedSubtask = new SubTicket(subtask, this.StatusMapping, this.Status);
          if (items.field === ChangelogField.ASSIGNEE) {
            const assignee = { assigneeId: items.to, name: items.toString };
            updatedSubtask.addAssignee(assignee);
          }
          if (
            items.to !== String(this.StatusMapping[this.Status.To_Do].id) &&
            items.fieldId === ChangelogField.STATUS
          ) {
            updatedSubtask.statusTransition(items.to, changelogs.timestamp);
            updatedSubtask.toJSON();
            const { status } = updatedSubtask.history.slice(-2)[0];
            this.overLappingTimeForSubtask(items.to, status);
            return updatedSubtask;
          }
        }
        return subtask;
      });
    }
  }

  private calculateDevTotalIfWithSubtasks(): void {
    const statusTimesArr: [number, number][] = [];
    let duration = 0;
    let prevToTime: number;

    this.subtasks.forEach((subtask) => {
      const subTicket = new SubTicket(subtask, this.StatusMapping, this.Status);

      let startIndex;
      let endIndex;
      while (subTicket.history.length > 0) {
        startIndex = subTicket.history.findIndex(
          (event) => event.status === this.StatusMapping[this.Status.In_Progress].label
        );
        endIndex = subTicket.history.findIndex(
          (event) => event.status === this.StatusMapping[this.Status.Done].label
        );

        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          statusTimesArr.push([
            moment(subTicket.history[startIndex].eventTime).valueOf(),
            moment(subTicket.history[endIndex].eventTime).valueOf(),
          ]);
          subTicket.history = subTicket.history.slice(endIndex + 1);
        } else {
          break;
        }
      }
    });

    statusTimesArr.sort((a, b) => a[0] - b[0]);
    statusTimesArr.forEach((times) => {
      const totalDuration = calculateTimeDifference(times[1], times[0]);
      duration += totalDuration;

      if (prevToTime && moment(times[0]).isBefore(moment(prevToTime))) {
        const overlap = calculateTimeDifference(prevToTime, times[0]);
        duration -= overlap;
      }
      const lastEventTime = times[1];
      prevToTime = lastEventTime;
    });

    this.development.total = duration;
  }

  private overLappingTimeForSubtask(toStatus: string, fromStatus: string): void | number {
    const toStatusLabel = this.StatusMapping[toStatus].label;
    if (toStatusLabel === fromStatus) return;
    let duration = 0;
    let toStatusTimes: string[] = [];
    let prevToTime: number;

    const state = `from_${fromStatus.toLowerCase()}_to_${toStatusLabel.toLowerCase()}`;
    const statusTimesArr: [number, number][] = [];

    this.subtasks.forEach((subtask) => {
      const subTicket = new SubTicket(subtask, this.StatusMapping, this.Status);
      if (subTicket.history.length > 0) {
        const fromStatusTimes = subTicket.history
          .filter((status) => status.status === fromStatus)
          .map((event) => event.eventTime);
        if (fromStatus === this.StatusMapping[this.Status.Code_Review].label) {
          let prevStatus: string;
          toStatusTimes = subTicket.history
            .filter((status) => {
              const isTargetStatus =
                status.status === this.StatusMapping[this.Status.In_Progress].label ||
                status.status === this.StatusMapping[this.Status.Dev_Complete].label;
              const isFollowedByCodeReview =
                prevStatus === this.StatusMapping[this.Status.Code_Review].label;
              prevStatus = status.status;
              return isTargetStatus && isFollowedByCodeReview;
            })
            .map((event) => event.eventTime);
        } else {
          toStatusTimes = subTicket.history
            .filter((status) => status.status === toStatusLabel)
            .map((event) => event.eventTime);
        }

        fromStatusTimes.forEach((fromTime, index): void => {
          if (toStatusTimes[index]) {
            statusTimesArr.push([
              moment(fromTime).valueOf(),
              moment(toStatusTimes[index]).valueOf(),
            ]);
          }
        });
      }
    });

    statusTimesArr.sort((a: [number, number], b: [number, number]): number => a[0] - b[0]);

    statusTimesArr.forEach((times) => {
      const totalDuration = calculateTimeDifference(times[1], times[0]);
      duration += totalDuration;
      if (prevToTime && moment(times[0]).isBefore(moment(prevToTime))) {
        const overlap = calculateTimeDifference(prevToTime, times[0]);
        duration -= overlap;
      }
      const lastEventTime = times[1];
      prevToTime = lastEventTime;
    });

    const updateDevelopment = (field: 'coding' | 'pickup' | 'review' | 'handover'): void => {
      this.development[field] = duration;
    };

    switch (state) {
      case 'from_in_progress_to_ready_for_review':
        updateDevelopment('coding');
        break;
      case 'from_ready_for_review_to_code_review':
        updateDevelopment('pickup');
        break;
      case 'from_code_review_to_dev_complete':
      case 'from_code_review_to_in_progress':
        updateDevelopment('review');
        break;
      case 'from_dev_complete_to_done':
        updateDevelopment('handover');
        break;
      default:
        break;
    }
    if (toStatusLabel === this.StatusMapping[this.Status.Done].label) {
      this.calculateDevTotalIfWithSubtasks();
    }
  }

  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      To_Do: ['In_Progress'],
      In_Progress: ['Ready_For_Review'],
      Ready_For_Review: ['Code_Review'],
      Code_Review: ['Dev_Complete', 'In_Progress'],
      Dev_Complete: ['Ready_For_QA'],
      Ready_For_QA: ['QA_In_Progress'],
      QA_In_Progress: ['QA_Failed', 'QA_Pass_Deploy'],
      QA_Failed: ['In_Progress'],
      QA_Pass_Deploy: ['Done'],
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions) {
      throw new Error(`Invalid_Status_Transition: ${currentStatus}`);
    }

    return allowedTransitions.includes(newStatus);
  }

  public async statusTransition(to: string, timestamp: string): Promise<void> {
    const toStatus = this.StatusMapping[to].label;
    if (this.history.length > 0) {
      const { status, eventTime } = this.history.slice(-1)[0];
      if (!this.isValidStatusTransition(status, toStatus)) {
        logger.error({ message: 'Invalid status transition', data: { issueId: this.issueId, to } });
        return;
      }
      const timeDiff = calculateTimeDifference(timestamp, eventTime);
      const state = `from_${status.toLowerCase()}_to_${toStatus.toLowerCase()}`;
      switch (state) {
        case 'from_todo_to_in_progress':
          break;
        case 'from_in_progress_to_ready_for_review':
          this.development.coding += timeDiff;
          break;
        case 'from_ready_for_review_to_code_review':
          this.development.pickup += timeDiff;
          break;
        case 'from_code_review_to_in_progress':
        case 'from_code_review_to_dev_complete':
          this.development.review += timeDiff;
          break;
        case 'from_dev_complete_to_ready_for_qa':
          this.development.handover += timeDiff;
          break;
        case 'from_ready_for_qa_to_qa_in_progress':
          this.qa.pickup += timeDiff;
          break;
        case 'from_qa_in_progress_to_qa_failed':
        case 'from_qa_in_progress_to_qa_pass_deploy':
          this.qa.testing += timeDiff;
          break;
        case 'from_qa_pass_deploy_to_done':
          this.deployment.total = timeDiff;
          break;
        default:
          break;
      }
    }

    this.updateHistory(toStatus, timestamp);
    this.calDevelopmentTime();
    if (toStatus === this.StatusMapping[this.Status.QA_Pass_Deploy].label) {
      this.calQaTotals();
    }
  }

  private calDevelopmentTime(): void {
    if (this.subtasks.length > 0) {
      this.calculateDevTotalIfWithSubtasks();
      return;
    }
    const inProgressTime = this.history.find(
      (status) => status.status === this.StatusMapping[this.Status.In_Progress].label
    );
    const readyForQaTime = this.history.find(
      (status) => status.status === this.StatusMapping[this.Status.Ready_For_QA].label
    );
    if (readyForQaTime) {
      this.development.total = calculateTimeDifference(
        readyForQaTime?.eventTime,
        inProgressTime?.eventTime
      );
    }

    const lastQaFailedIndex = this.history
      .map((status) => status.status)
      .lastIndexOf(this.StatusMapping[this.Status.QA_Failed].label);
    const lastReadyForQaIndex = this.history
      .map((status) => status.status)
      .lastIndexOf(this.StatusMapping[this.Status.Ready_For_QA].label);

    if (lastQaFailedIndex !== -1 && lastReadyForQaIndex > lastQaFailedIndex) {
      const inProgressTimeAfterQaFailed = this.history
        .slice(lastQaFailedIndex + 1)
        .find((status) => status.status === this.StatusMapping[this.Status.In_Progress].label);
      const readyForQaTimeAfterQaFailed = this.history
        .slice(lastQaFailedIndex + 1)
        .find((status) => status.status === this.StatusMapping[this.Status.Ready_For_QA].label);

      if (readyForQaTimeAfterQaFailed) {
        this.development.total += calculateTimeDifference(
          readyForQaTimeAfterQaFailed?.eventTime,
          inProgressTimeAfterQaFailed?.eventTime
        );
      }
    }
  }

  private calQaTotals(): void {
    const statusTimesArr: [number, number][] = [];
    let duration = 0;
    let prevToTime: number;
    const fromStatusTimes = this.history
      .filter((status) => status.status === this.StatusMapping[this.Status.Ready_For_QA].label)
      .map((event) => event.eventTime);

    const toStatusTimes = this.history
      .filter(
        (status) =>
          status.status === this.StatusMapping[this.Status.QA_Pass_Deploy].label ||
          status.status === this.StatusMapping[this.Status.QA_Failed].label
      )
      .map((event) => event.eventTime);

    fromStatusTimes.forEach((fromTime, index) => {
      if (toStatusTimes[index]) {
        statusTimesArr.push([moment(fromTime).valueOf(), moment(toStatusTimes[index]).valueOf()]);
      }
    });
    statusTimesArr.sort((a, b) => a[0] - b[0]);
    statusTimesArr.forEach((times) => {
      const totalDuration = calculateTimeDifference(times[1], times[0]);
      duration += totalDuration;

      if (prevToTime && moment(times[0]).isBefore(moment(prevToTime))) {
        const overlap = calculateTimeDifference(prevToTime, times[0]);
        duration -= overlap;
      }
      const lastEventTime = times[1];
      prevToTime = lastEventTime;
    });
    this.qa.total = duration;
  }

  public toJSON(): Jira.Type.CycleTime {
    return {
      id: this.issueId,
      body: {
        id: this.issueId,
        issueId: this.issueId,
        sprintId: this.sprintId,
        subtasks: this.subtasks.map((subtask) =>
          new SubTicket(subtask, this.StatusMapping, this.Status).toJSON()
        ),
        organizationId: this.orgId,
        projectId: this.projectId,
        issueKey: this.issueKey,
        projectKey: this.projectKey,
        title: this.title,
        development: this.development,
        qa: this.qa,
        deployment: this.deployment,
        assignees: this.assignees,
        history: this.history,
        issueType: this.issueType,
        isDeleted: this.isDeleted ?? false,
        deletedAt: this.deletedAt || null,
      },
    };
  }
}
