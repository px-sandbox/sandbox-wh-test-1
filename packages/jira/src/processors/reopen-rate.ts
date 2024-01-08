import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class ReopenRateProcessor extends DataProcessor<
    Jira.Mapped.ReopenRateIssue,
    Jira.Type.ReopenRate
> {
    constructor(data: Jira.Mapped.ReopenRateIssue) {
        super(data);
    }
    public validate(): false | this {
        const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
        if (this.apiData !== undefined && projectKeys.includes(this.apiData.issue.fields.project.key)) {
            return this;
        }
        logger.info({
            message: 'EMPTY_DATA or projectKey not in available keys for this issue',
            data: this.apiData,
        });
        return false;
    }

    public async processor(): Promise<Jira.Type.ReopenRate> {
        const orgData = await getOrganization(this.apiData.organization);

        if (!orgData) {
            logger.error(`Organization ${this.apiData.organization} not found`);
            throw new Error(`Organization ${this.apiData.organization} not found`);
        }
        const parentId: string | undefined = await this.getParentId(
            `${mappingPrefixes.reopen_rate}_${this.apiData.issue.id}_${mappingPrefixes.sprint}_${this.apiData.sprintId}_${mappingPrefixes.org}_${orgData.orgId}`
        );
        const repoRateObj = {
            id: parentId || uuid(),
            body: {
                id: `${mappingPrefixes.reopen_rate}_${this.apiData.issue.id}_${mappingPrefixes.sprint}_${this.apiData.sprintId}`,
                sprintId: `${mappingPrefixes.sprint}_${this.apiData.sprintId}`,
                boardId: `${this.apiData.boardId}` ?? null,
                projectId: `${mappingPrefixes.project}_${this.apiData.issue.fields.project.id}`,
                projectKey: this.apiData.issue.fields.project.key,
                issueId: `${mappingPrefixes.issue}_${this.apiData.issue.id}`,
                issueKey: this.apiData.issue.key,
                reOpenCount: this.apiData.reOpenCount ?? 0,
                isReopen: !!this.apiData.reOpenCount,
                organizationId: `${mappingPrefixes.organization}_${orgData.orgId}`,
                isDeleted: false,
                deletedAt: null,
            },
        };
        return repoRateObj;
    }
}
