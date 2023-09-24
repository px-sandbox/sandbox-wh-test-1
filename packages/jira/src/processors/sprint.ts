import { Jira } from 'abstraction';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class SprintProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Sprint,
  Jira.Type.Sprint
> {
  constructor(data: Jira.ExternalType.Webhook.Sprint) {
    super(data);
  }

  public async processor(): Promise<Jira.Type.Sprint> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.sprint}_${this.jiraApiData.id}`
    );

    const sprintObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.sprint}_${this.jiraApiData.id}`,
        jiraSprintId: `${this.jiraApiData.id}`,
        self: this.jiraApiData.self,
        name: this.jiraApiData.name,
        state: this.jiraApiData.state,
        createdDate: this.jiraApiData.createdDate,
        startDate: this.jiraApiData.startDate,
        endDate: this.jiraApiData.endDate,
        originBoardId: this.jiraApiData.originBoardId,
        isDelete: false,
        deletedAt: null,
        //add organization id
      },
    };
    return sprintObj;
  }
}
