import { Jira } from 'abstraction';
import { Subtasks } from 'abstraction/jira/external/api';
import { logger } from 'core';
import moment from 'moment';
import { calculateTimeDifference } from '../../util/cycle-time';

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
  public assignees: { assigneeId: string; name: string }[];
  public history: { status: string; eventTime: string }[];

  constructor(
    subtaskData: Subtasks,
    private StatusMapping: Record<string, { label: string; id: number }>,
    private Status: Record<string, number>
  ) {
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

  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      To_Do: ['In_Progress'],
      In_Progress: ['Ready_For_Review'],
      Ready_For_Review: ['Code_Review'],
      Code_Review: ['Dev_Complete', 'In_Progress'],
      Dev_Complete: ['Done'],
      Done: ['In_Progress'],
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions) {
      throw new Error(`Invalid_Status_Transition: ${currentStatus} => ${newStatus}`);
    }

    return allowedTransitions.includes(newStatus);
  }

  public async statusTransition(to: string, timestamp: string): Promise<void> {
    const toStatus = this.StatusMapping[to].label;
    if (this.history.length > 0) {
      const { status, eventTime } = this.history.slice(-1)[0];
      if (!this.isValidStatusTransition(status, toStatus)) {
        logger.error({
          message: 'Invalid status transition',
          data: { from: this.history.slice(-1)[0].status, to },
        });
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
        case 'from_dev_complete_to_done':
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
    const statusTimesArr: [number, number][] = [];
    let duration = 0;
    let prevToTime: number;
    let tempHistory = [...this.history];
    let startIndex;
    let endIndex;
    while (tempHistory.length > 0) {
      startIndex = tempHistory.findIndex(
        (event) => event.status === this.StatusMapping[this.Status.In_Progress].label
      );

      endIndex = tempHistory.findIndex(
        (event) => event.status === this.StatusMapping[this.Status.Done].label
      );
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        statusTimesArr.push([
          Number(tempHistory[startIndex].eventTime),
          Number(tempHistory[endIndex].eventTime),
        ]);
        tempHistory = tempHistory.slice(endIndex + 1);
      } else {
        break;
      }
    }
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
  public toJSON(): Jira.Type.SubTicket {
    return {
      issueId: this.issueId,
      issueKey: this.issueKey,
      title: this.title,
      development: this.development,
      assignees: this.assignees,
      history: this.history,
    };
  }
}
