import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { JiraClient } from 'src/lib/jira-client';
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
    const orgData = await this.getOrganizationId(this.jiraApiData.organisation);
    const jiraClient = await JiraClient.getClient(this.jiraApiData.organisation);
    const board = await jiraClient.getBoard(this.jiraApiData.originBoardId);

    const sprintObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.sprint}_${this.jiraApiData.id}`,
        jiraSprintId: `${this.jiraApiData.id}`,
        projectKey: board.location.projectId,
        self: this.jiraApiData.self,
        name: this.jiraApiData.name,
        state: this.jiraApiData.state,
        createdDate: this.jiraApiData.createdDate,
        startDate: this.jiraApiData.startDate,
        endDate: this.jiraApiData.endDate,
        completeDate: this.jiraApiData.completeDate,
        originBoardId: this.jiraApiData.originBoardId,
        isDeleted: this.jiraApiData.isDeleted ?? false,
        deletedAt: this.jiraApiData.deletedAt ?? null,
        organizationId: orgData.body.id ?? null,
      },
    };
    return sprintObj;
  }
}
