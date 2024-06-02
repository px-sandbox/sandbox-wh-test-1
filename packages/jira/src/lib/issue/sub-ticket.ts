import { Jira } from 'abstraction';
import moment from 'moment';
import { Subtasks } from 'abstraction/jira/external/api';
import { mappingPrefixes } from '../../constant/config';

export class SubTicket {
  public issueId: string;
  public issueKey: string;
  public development: {
    coding: number;
    pickup: number;
    review: number;
    handover: number;
    total: number;
  };
  public title: string;
  public assignees: any[];
  public history: { status: string; eventTime: string }[];

  constructor(subtaskData: Subtasks, private StatusMapping: Record<string, { label: string }>) {
    this.issueId = subtaskData.issueId;
    this.issueKey = subtaskData.issueKey;
    this.development = subtaskData.development ?? {
      coding: 0,
      pickup: 0,
      review: 0,
      handover: 0,
      total: 0,
    };
    this.assignees = subtaskData.assignees ?? [];
    this.title = subtaskData.title ?? '';
    this.history = subtaskData.history ?? [];
  }

  private updateHistory(to: string, timestamp: string): void {
    this.history.push({ status: to, eventTime: timestamp });
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
        default:
          break;
      }
    }
    this.updateHistory(toStatus, timestamp);
    this.calculateTotal();
  }

  public calculateTotal(): void {
    const inProgressTime = this.history.find((status) => status.status === 'In_Progress');
    const readyForQaTime = this.history.find((status) => status.status === 'Ready_For_QA');
    if (readyForQaTime) {
      this.development.total = moment(readyForQaTime?.eventTime).diff(
        moment(inProgressTime?.eventTime),
        'minutes'
      );
    }

    const lastQaFailedIndex = this.history.map((status) => status.status).lastIndexOf('QA_Failed');
    const lastReadyForQaIndex = this.history
      .map((status) => status.status)
      .lastIndexOf('Ready_For_QA');

    if (lastQaFailedIndex !== -1 && lastReadyForQaIndex > lastQaFailedIndex) {
      const inProgressTimeAfterQaFailed = this.history
        .slice(lastQaFailedIndex + 1)
        .find((status) => status.status === 'In_Progress');
      const readyForQaTimeAfterQaFailed = this.history
        .slice(lastQaFailedIndex + 1)
        .find((status) => status.status === 'Ready_For_QA');

      if (readyForQaTimeAfterQaFailed) {
        this.development.total += moment(readyForQaTimeAfterQaFailed?.eventTime).diff(
          moment(inProgressTimeAfterQaFailed?.eventTime),
          'minutes'
        );
      }
    }
  }
  public toJSON(): Jira.Type.SubTicket {
    return {
      issueId: `${mappingPrefixes.sprint}_${this.issueId}`,
      issueKey: this.issueKey,
      title: this.title,
      development: this.development,
      assignees: this.assignees,
      history: this.history,
    };
  }
}
