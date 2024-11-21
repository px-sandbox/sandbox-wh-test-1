import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { JiraClient } from '../lib/jira-client';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class BoardProcessor extends DataProcessor<Jira.Mapper.Board, Jira.Type.Board> {
  constructor(
    data: Jira.Mapper.Board,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.Board, retryProcessId);
  }

  public async process(): Promise<void> {
    //Check for all board cases
    switch (this.eventType) {
      case Jira.Enums.Event.BoardCreated:
        await this.format();
        break;
    }
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
    const apiBoardData = await jiraClient.getBoard(this.apiData.id);
    this.formattedData = {
      id: await this.getParentId(
        `${mappingPrefixes.board}_${this.apiData.id}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        id: `${mappingPrefixes.board}_${this.apiData?.id}`,
        boardId: this.apiData?.id,
        self: this.apiData.self,
        name: this.apiData.name,
        type: apiBoardData.type,
        projectId: `${mappingPrefixes.project}_${apiBoardData.location.projectId}`,
        projectKey: apiBoardData.location.projectKey,
        filter: this.apiData?.filter ?? null,
        columnConfig: this.apiData?.columnConfig ?? null,
        ranking: this.apiData?.ranking ?? null,
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        createdAt: this.apiData.createdAt,
        organizationId: orgData.id ?? null,
      },
    };
  }
}
