import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

/**
 * Data processor for Jira projects.
 * @template ExternalType - The external type of the data.
 * @template Type - The type of the processed data.
 */
export class ProjectProcessor extends DataProcessor<Jira.ExternalType.Webhook.Project, Jira.Type.Project> {
  /**
   * Constructor for the ProjectProcessor class.
   * @param data - The data to be processed.
   */
  constructor(data: Jira.ExternalType.Webhook.Project) {
    super(data);
  }

  /**
   * Processes the Jira project data and returns the processed data.
   * @returns The processed Jira project data.
   */
  public async processor(): Promise<Jira.Type.Project> {
    const parentId = await this.getParentId(
      `${mappingPrefixes.project}_${this.jiraApiData.id}`
    );

    const projectObj = {
      id: parentId ?? uuid(),
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
        deletedAt: this.jiraApiData?.deletedAt?? null,
        updatedAt: this.jiraApiData?.updatedAt?? null,
        
      },
    };
    return projectObj;
  }
}
