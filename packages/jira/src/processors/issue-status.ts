import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class IssueStatusProcessor extends DataProcessor<
  Jira.ExternalType.Api.IssueStatus,
  Jira.Type.IssueStatus
> {
  constructor(data: Jira.ExternalType.Api.IssueStatus) {
    super(data);
  }

  // eslint-disable-next-line complexity
  public async processor(): Promise<Jira.Type.IssueStatus> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error(`Organization ${this.apiData.organization} not found`);
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    const jiraId = `${mappingPrefixes.issueStatus}_${this.apiData.id}_${mappingPrefixes.org}_${orgData.orgId}`;
    let parentId: string | undefined = await this.getParentId(jiraId);
    // if parent id is not present in dynamoDB then create a new parent id
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, jiraId);
    }

    const issueStatusObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.issueStatus}_${this.apiData.id}`,
        issueStatusId: this.apiData.id,
        name: this.apiData.name,
        status: this.apiData.statusCategory,
        organizationId: orgData.id,
        pxStatus: null,
      },
    };
    return issueStatusObj;
  }
}
