import { IssuesTypes } from 'abstraction/jira/enums';
import { Subtasks } from 'abstraction/jira/external/api';
import moment from 'moment';
import { Jira } from 'abstraction';
import { mappingPrefixes } from '../../constant/config';
import { SubTicket } from './sub-ticket';

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
  public assignees: { id: string; name: string; email: string }[];
  public history: { status: string; eventTime: string }[];
  public title: string;
  public issueType: string;

  constructor(data: Jira.Type.MainTicket, private StatusMapping, private Status) {
    this.issueId = data.issueId;
    this.sprintId = data.sprintId;
    this.subtasks = data.subtasks ?? [];
    this.orgId = data.orgId;
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
  }

  private updateHistory(toStatus: string, timestamp: string): void {
    this.history.push({ status: toStatus, eventTime: timestamp });
  }

  public addSubtask(subtask: Subtasks): void {
    this.subtasks.push(subtask);
  }

  public addAssignee(assignees: { id: string; name: string; email: string }): void {
    this.assignees.push(assignees);
  }

  private calculateTimeDifference(
    fromTime: string | undefined,
    toTime: string | undefined
  ): number {
    if (!fromTime || !toTime) return 0;
    return moment(toTime).diff(moment(fromTime), 'minutes');
  }

  public async changelog(changelogs: any): Promise<any> {
    const [items] = changelogs.items.filter(
      (item: Jira.ExternalType.Webhook.ChangelogItem) => item.fieldId === 'status'
    );

    if (items) {
      const statuses = [
        this.Status.To_Do,
        this.Status.In_Progress,
        this.Status.Ready_For_Review,
        this.Status.Code_Review,
        this.Status.Dev_Complete,
        this.Status.Ready_For_QA,
      ];
      if (
        [IssuesTypes.STORY, IssuesTypes.TASK, IssuesTypes.BUG].includes(
          changelogs.issuetype as IssuesTypes
        )
      ) {
        if (this.subtasks.length > 0 && statuses.includes(items.to)) {
          const toStatus = this.StatusMapping[items.to].label;
          this.updateHistory(toStatus, changelogs.timestamp);
        } else {
          this.statusTransition(items.to, changelogs.timestamp);
        }
      }

      this.subtasks = this.subtasks.map((subtask, i) => {
        if (changelogs.issueId === this.subtasks[i].issueId) {
          const updatedSubtask = new SubTicket(subtask, this.StatusMapping);
          if (items.to !== String(this.StatusMapping[this.Status.To_Do].id)) {
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
    if (this.subtasks.length > 0) {
      let totalDuration = 0;
      let overlapDuration = 0;
      let prevEndTime = '';

      this.subtasks.forEach((subtask) => {
        const subTicket = new SubTicket(subtask, this.StatusMapping);
        const startTimeEvent = subTicket.history.find(
          (status) => status.status === this.StatusMapping[this.Status.In_Progress].label
        );
        const endTimeEvent = subTicket.history.find(
          (status) => status.status === this.StatusMapping[this.Status.Ready_For_QA].label
        );

        if (startTimeEvent && endTimeEvent) {
          const duration = this.calculateTimeDifference(
            startTimeEvent.eventTime,
            endTimeEvent.eventTime
          );
          totalDuration += duration;

          if (prevEndTime && moment(startTimeEvent.eventTime).isBefore(moment(prevEndTime))) {
            const overlap = moment(prevEndTime).diff(moment(startTimeEvent.eventTime), 'minutes');
            overlapDuration += overlap;
          }

          prevEndTime = endTimeEvent.eventTime;
        }
      });

      totalDuration -= overlapDuration;
      this.development.total = totalDuration;
    }
  }

  private overLappingTimeForSubtask(toStatus: string, fromStatus: string): void | number {
    toStatus = this.StatusMapping[toStatus].label;
    if (toStatus === fromStatus) return;
    let duration = 0;
    const fromStatusArr: any = [];
    const toStatusArr: any = [];
    let prevToTime: string;
    let overlapDuration = 0;
    let isOverlap = false;
    const state = `from_${fromStatus.toLowerCase()}_to_${toStatus.toLowerCase()}`;

    this.subtasks.forEach((subtask) => {
      const subTicket = new SubTicket(subtask, this.StatusMapping);
      if (subTicket.history.length > 0) {
        fromStatusArr.push(
          ...subTicket.history
            .filter((status) => status.status === fromStatus)
            .map((event) => event.eventTime)
            .slice(-1)
        );
        toStatusArr.push(
          ...subTicket.history
            .filter((status) => status.status === toStatus)
            .map((event) => event.eventTime)
            .slice(-1)
        );
      }
    });
    if (fromStatusArr.length === toStatusArr.length) {
      fromStatusArr.forEach((fromTime: string, index: number) => {
        isOverlap = false;
        if (toStatusArr[index]) {
          const totalDuration = moment(toStatusArr[index]).diff(moment(fromTime), 'minutes');
          duration = totalDuration;
          if (prevToTime && moment(fromTime).isBefore(moment(prevToTime))) {
            const overlap = moment(prevToTime).diff(moment(fromTime), 'minutes');
            overlapDuration += overlap;
            isOverlap = true;
          }
          prevToTime = toStatusArr[index];
        }
      });
    } else if (fromStatusArr.length < toStatusArr.length) {
      toStatusArr.forEach((toTime: string, index: string) => {
        if (fromStatusArr[index]) {
          const totalDuration = moment(toStatusArr[index + 1]).diff(
            moment(fromStatusArr[index]),
            'minutes'
          );
          duration += totalDuration;
        }
      });
    } else if (fromStatusArr.length > toStatusArr.length) {
      fromStatusArr.forEach((fromTime: string, index: number) => {
        if (toStatusArr[index]) {
          const totalDuration = moment(toStatusArr[index]).diff(moment(fromTime), 'minutes');
          duration += totalDuration;
        }
      });
    }

    if (toStatus === this.StatusMapping[this.Status.Ready_For_QA].label) {
      this.calculateDevTotalIfWithSubtasks();
    }

    const updateDevelopment = (field: any): void => {
      this.development[field] += duration;
      if (isOverlap) this.development[field] -= overlapDuration;
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
      case 'from_dev_complete_to_ready_for_qa':
        this.development.handover += duration;
        break;
      default:
        break;
    }
  }

  public async statusTransition(to: string, timestamp: string): Promise<void> {
    const toStatus = this.StatusMapping[to].label;
    if (this.history.length > 0) {
      const { status, eventTime } = this.history.slice(-1)[0];
      const timeDiff = moment(timestamp).diff(moment(eventTime), 'minutes');
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
    this.calQaTotals();
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
      this.development.total = moment(readyForQaTime?.eventTime).diff(
        moment(inProgressTime?.eventTime),
        'minutes'
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
        this.development.total += moment(readyForQaTimeAfterQaFailed?.eventTime).diff(
          moment(inProgressTimeAfterQaFailed?.eventTime),
          'minutes'
        );
      }
    }
  }

  private calQaTotals(): void {
    const readyForQaTime = this.history.find(
      (status) => status.status === this.StatusMapping[this.Status.Ready_For_QA].label
    );
    const qaPassDeployTime = this.history.find(
      (status) => status.status === this.StatusMapping[this.Status.QA_Pass_Deploy].label
    );
    if (qaPassDeployTime) {
      this.qa.total = moment(qaPassDeployTime?.eventTime).diff(
        moment(readyForQaTime?.eventTime),
        'minutes'
      );
    }
  }

  public toJSON(): Jira.Type.CycleTime {
    return {
      id: `${mappingPrefixes.cycleTime}_${this.issueId}`,
      body: {
        id: `${mappingPrefixes.cycleTime}_${this.issueId}`,
        issueId: `${mappingPrefixes.issue}_${this.issueId}`,
        sprintId: `${mappingPrefixes.sprint}_${this.sprintId}`,
        subtasks: this.subtasks.map((subtask) =>
          new SubTicket(subtask, this.StatusMapping).toJSON()
        ),
        organizationId: `${mappingPrefixes.organization}_${this.orgId}`,
        projectId: `${mappingPrefixes.project}_${this.projectId}`,
        issueKey: this.issueKey,
        projectKey: this.projectKey,
        title: this.title,
        development: this.development,
        qa: this.qa,
        deployment: this.deployment,
        assignees: this.assignees,
        history: this.history,
        issueType: this.issueType,
      },
    };
  }
}
