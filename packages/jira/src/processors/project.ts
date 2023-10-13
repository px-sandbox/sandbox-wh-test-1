import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

/**
 * Data processor for Jira project data.
 */
export class ProjectProcessor extends DataProcessor<Jira.Mapped.Project, Jira.Type.Project> {
  /**
   * Constructor for ProjectProcessor.
   * @param data - The Jira project data to be processed.
   */
  constructor(data: Jira.Mapped.Project) {
    super(data);
  }

  /**
   * Processes the Jira project data and returns the processed data.
   * @returns The processed Jira project data.
   */
  public async processor(): Promise<Jira.Type.Project> {
    const parentId = await this.getParentId(`${mappingPrefixes.project}_${this.apiData.id}_${mappingPrefixes.org}_${this.apiData.organization}`);

    const orgData = await this.getOrganizationId(this.apiData.organization);

    const projectObj = {
      id: parentId ?? uuid(),
      body: {
        id: `${mappingPrefixes.project}_${this.apiData?.id}_${mappingPrefixes.org}_${orgData.body.id}`,
        projectId: this.apiData?.id.toString(),
        key: this.apiData?.key,
        name: this.apiData?.name,
        avatarUrls: this.apiData?.avatarUrls
          ? {
            avatarUrl48x48: this.apiData?.avatarUrls['48x48'],
            avatarUrl32x32: this.apiData?.avatarUrls['32x32'],
            avatarUrl24x24: this.apiData?.avatarUrls['24x24'],
            avatarUrl16x16: this.apiData?.avatarUrls['16x16'],
          }
          : null,
        lead: {
          accountId: this.apiData?.lead?.accountId,
          displayName: this.apiData?.lead?.displayName,
          active: this.apiData?.lead?.active,
          timeZone: this.apiData?.lead?.timeZone,
          accountType: this.apiData?.lead?.accountType,
          avatarUrls: this.apiData?.avatarUrls
            ? {
              avatarUrl48x48: this.apiData?.avatarUrls['48x48'],
              avatarUrl32x32: this.apiData?.avatarUrls['32x32'],
              avatarUrl24x24: this.apiData?.avatarUrls['24x24'],
              avatarUrl16x16: this.apiData?.avatarUrls['16x16'],
            }
            : null,
        },
        organizationId: `${mappingPrefixes.organization}_${orgData.body.id}` ?? null,
        assigneeType: this.apiData?.assigneeType,
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        updatedAt: this.apiData?.updatedAt ?? null,
        createdAt: this.apiData?.createdAt ?? null,
      },
    };

    return projectObj;
  }
}
