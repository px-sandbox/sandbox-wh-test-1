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
  constructor(
    data: Jira.ExternalType.Webhook.Sprint,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.Sprint, retryProcessId);
  }

  public async process(): Promise<void> {
    // TODO: Implement the switch cases.
    // switch (this.eventType) {
    //   case Jira.Enums.Event.SprintCreated:
    //     await this.format();
    //     break;
    // }

    await this.format();
  }

  public async format(): Promise<void> {
    //can be moved to parent class
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.apiData.organization} not found`,
      });
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }

    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const board = await jiraClient.getBoard(this.apiData.originBoardId);

    this.formattedData = {
      id: await this.getParentId(
        `${mappingPrefixes.sprint}_${this.apiData.id}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
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
  }
}
