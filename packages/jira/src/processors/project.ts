import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class ProjectProcessor extends DataProcessor<Jira.ExternalType.Webhook.Project, Jira.Type.Project> {
  constructor(data: Jira.ExternalType.Webhook.Project) {
    super(data);
  }
  public async processor(): Promise<Jira.Type.Project> {
    const parentId = await this.getParentId(
      `${mappingPrefixes.project}_${this.jiraApiData.id}`
    );

    const projectObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.project}_${this.jiraApiData?.id}`,
        jiraProjectId: this.jiraApiData?.id,
        
        key: this.jiraApiData?.key,
        name: this.jiraApiData?.name,
        avatarUrls: this.jiraApiData?.avatarUrls
          ? {
              avatarUrl48x48: this.jiraApiData?.avatarUrls['48x48'],
              avatarUrl32x32: this.jiraApiData?.avatarUrls['32x32'],
              avatarUrl24x24: this.jiraApiData?.avatarUrls['24x24'],
              avatarUrl16x16: this.jiraApiData?.avatarUrls['16x16'],
            }
          : null,
        projectLead: {
            
            accountId: this.jiraApiData?.projectLead?.accountId,
            displayName: this.jiraApiData?.projectLead?.displayName,
            active: this.jiraApiData?.projectLead?.active,
            timeZone: this.jiraApiData?.projectLead?.timeZone,
            accountType: this.jiraApiData?.projectLead?.accountType,
            avatarUrls: this.jiraApiData?.avatarUrls
          ? {
              avatarUrl48x48: this.jiraApiData?.avatarUrls['48x48'],
              avatarUrl32x32: this.jiraApiData?.avatarUrls['32x32'],
              avatarUrl24x24: this.jiraApiData?.avatarUrls['24x24'],
              avatarUrl16x16: this.jiraApiData?.avatarUrls['16x16'],
            }
          : null
          ,
        },
        assigneeType: this.jiraApiData?.assigneeType,
        isDeleted: !!this.jiraApiData.isDeleted,
        deletedAt: this.jiraApiData?.deletedAt,
        updatedAt: this.jiraApiData?.updatedAt,
        
      },
    };
    return projectObj;
  }
}
