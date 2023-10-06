import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { JiraClient } from '../lib/jira-client';
import { DataProcessor } from './data-processor';


export class BoardProcessor extends DataProcessor<Jira.Mapper.Board, Jira.Type.Board> {
  constructor(data: Jira.Mapper.Board) {
    super(data);
  }
  public async processor(): Promise<Jira.Type.Board> {
    const parentId = await this.getParentId(`${mappingPrefixes.board}_${this.apiData.id}`);
    const orgData = await this.getOrganizationId(this.apiData.organization);
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const apiBoardData = await jiraClient.getBoard(this.apiData.id);
    
    const boardObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.board}_${this.apiData?.id}`,
        boardId: this.apiData?.id,
        self: this.apiData.self,
        name: this.apiData.name,
        type: apiBoardData.type?.toLowerCase() as Jira.Enums.BoardType,
        location: apiBoardData?.location ?? null,
        filter: this.apiData?.filter ?? null,
        columnConfig: this.apiData?.columnConfig ?? null,
        ranking: this.apiData?.ranking ?? null,
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        createdAt: this.apiData.createdAt,
        organizationId: orgData.body.id ?? null,
      },
    };
    return boardObj;
  }
}
