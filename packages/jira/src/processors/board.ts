import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { JiraClient } from '../lib/jira-client';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class BoardProcessor extends DataProcessor<Jira.Mapper.Board, Jira.Type.Board> {
  constructor(data: Jira.Mapper.Board) {
    super(data);
  }
  public async processor(): Promise<Jira.Type.Board> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error(`Organization ${this.apiData.organization} not found`);
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    let parentId = await this.getParentId(`${mappingPrefixes.board}_${this.apiData.id}
    _${mappingPrefixes.org}_${orgData.orgId}`);

    // if parent id is not present in dynamoDB then create a new parent id
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(
        parentId,
        `${mappingPrefixes.board}_${this.apiData.id}
        _${mappingPrefixes.org}_${orgData.orgId}`
      );
    }
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const apiBoardData = await jiraClient.getBoard(this.apiData.id);
    const { projectId, projectKey } = apiBoardData.location;
    const boardObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.board}_${this.apiData?.id}`,
        boardId: this.apiData?.id,
        self: this.apiData.self,
        name: this.apiData.name,
        type: apiBoardData.type,
        projectId: `${mappingPrefixes.project}_${projectId}`,
        projectKey,
        filter: this.apiData?.filter ?? null,
        columnConfig: this.apiData?.columnConfig ?? null,
        ranking: this.apiData?.ranking ?? null,
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        createdAt: this.apiData.createdAt,
        organizationId: orgData.id ?? null,
      },
    };
    return boardObj;
  }
}
