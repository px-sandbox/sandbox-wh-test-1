import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
import { JiraClient } from '../lib/jira-client';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class SprintProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Sprint,
  Jira.Type.Sprint
> {
  constructor(data: Jira.ExternalType.Webhook.Sprint) {
    super(data);
  }

  public async processor(): Promise<Jira.Type.Sprint> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error(`Organization ${this.apiData.organization} not found`);
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    const parentId: string | undefined = await this.getParentId(
      `${mappingPrefixes.sprint}_${this.apiData.id}_${mappingPrefixes.org}_${orgData.orgId}`
    );

    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const board = await jiraClient.getBoard(this.apiData.originBoardId);

    const sprintObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.sprint}_${this.apiData.id}`,
        sprintId: `${this.apiData.id}`,
        projectId: `${mappingPrefixes.project}_${board.location?.projectId}`,
        self: this.apiData.self,
        name: this.apiData.name,
        state: this.apiData.state,
        createdDate: this.apiData.createdDate,
        startDate: this.apiData.startDate,
        endDate: this.apiData.endDate,
        completeDate: this.apiData.completeDate,
        originBoardId: `${mappingPrefixes.board}_${this.apiData.originBoardId}`,
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.id ?? null,
      },
    };
    return sprintObj;
  }
}
