import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';
import { JiraClient } from '../lib/jira-client';

export class SprintProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Sprint,
  Jira.Type.Sprint
> {
  constructor(data: Jira.ExternalType.Webhook.Sprint) {
    super(data);
  }

  public async processor(): Promise<Jira.Type.Sprint> {
    const parentId: string | undefined = await this.getParentId(
      `${mappingPrefixes.sprint}_${this.apiData.id}`
    );
    const orgData = await this.getOrganizationId(this.apiData.organization);
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const board = await jiraClient.getBoard(this.apiData.originBoardId);

    const sprintObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.sprint}_${this.apiData.id}`,
        jiraSprintId: `${this.apiData.id}`,
        projectKey: board.location.projectId,
        self: this.apiData.self,
        name: this.apiData.name,
        state: this.apiData.state,
        createdDate: this.apiData.createdDate,
        startDate: this.apiData.startDate,
        endDate: this.apiData.endDate,
        completeDate: this.apiData.completeDate,
        originBoardId: this.apiData.originBoardId,
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.body.id ?? null,
      },
    };
    return sprintObj;
  }
}
