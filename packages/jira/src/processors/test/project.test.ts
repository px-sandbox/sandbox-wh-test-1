import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { ProjectProcessor } from '../project';
import { getOrganization } from '../../repository/organization/get-organization';
import { mappingPrefixes } from '../../constant/config';
import { Config } from 'sst/node/config';

vi.mock('../../repository/organization/get-organization');
vi.mock('sst/node/config', () => ({
  Config: {
    OPENSEARCH_NODE: 'https://test-node:9200',
    OPENSEARCH_USERNAME: 'test-username',
    OPENSEARCH_PASSWORD: 'test-password',
  },
}));

const mockGetOrganization = vi.mocked(getOrganization);
describe('ProjectProcessor', () => {
  let projectProcessor: ProjectProcessor;
  let apiData: Jira.Mapped.Project;
  let requestId: string;
  let resourceId: string;

  beforeEach(() => {
    apiData = {
      self: 'self-url',
      id: '123',
      key: 'PROJ',
      projectTypeKey: 'software',
      lead: {
        self: 'lead-self-url',
        accountId: 'lead-account-id',
        avatarUrls: {
          '48x48': 'url48',
          '32x32': 'url32',
          '24x24': 'url24',
          '16x16': 'url16',
        },
        displayName: 'Lead Name',
        active: true,
        timeZone: 'UTC',
        accountType: 'atlassian',
      },
      assigneeType: 'PROJECT_LEAD',
      name: 'Test Project',
      avatarUrls: {
        '48x48': 'url48',
        '32x32': 'url32',
        '24x24': 'url24',
        '16x16': 'url16',
      },
      organization: 'org-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };

    requestId = 'test-request-id';
    resourceId = 'test-resource-id';

    projectProcessor = new ProjectProcessor(apiData, requestId, resourceId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('format', () => {
    it('should format the project data correctly', async () => {
      const mockOrgData = { orgId: 'org123', _id: 'jira_org_org123' };
      mockGetOrganization.mockResolvedValueOnce(mockOrgData);
      vi.spyOn(projectProcessor, 'getParentId').mockResolvedValue('parent-id');

      await projectProcessor.format();

      expect(getOrganization).toHaveBeenCalledWith(apiData.organization);
      expect(projectProcessor.formattedData).toEqual({
        id: 'parent-id',
        body: {
          id: `${mappingPrefixes.project}_${apiData.id}`,
          projectId: apiData.id,
          key: apiData.key,
          name: apiData.name,
          projectTypeKey: apiData.projectTypeKey,
          avatarUrls: {
            avatarUrl48x48: apiData.avatarUrls['48x48'],
            avatarUrl32x32: apiData.avatarUrls['32x32'],
            avatarUrl24x24: apiData.avatarUrls['24x24'],
            avatarUrl16x16: apiData.avatarUrls['16x16'],
          },
          lead: {
            accountId: `${mappingPrefixes.user}_${apiData.lead.accountId}`,
            displayName: apiData.lead.displayName,
            active: apiData.lead.active,
            timeZone: apiData.lead.timeZone,
            accountType: apiData.lead.accountType,
            avatarUrls: {
              avatarUrl48x48: apiData.lead.avatarUrls['48x48'],
              avatarUrl32x32: apiData.lead.avatarUrls['32x32'],
              avatarUrl24x24: apiData.lead.avatarUrls['24x24'],
              avatarUrl16x16: apiData.lead.avatarUrls['16x16'],
            },
          },
          organizationId: null,
          assigneeType: apiData.assigneeType,
          isDeleted: apiData.isDeleted,
          deletedAt: apiData.deletedAt,
          updatedAt: expect.any(String),
          createdAt: expect.any(String),
        },
      });
    });

    it('should throw an error if organization is not found', async () => {
      mockGetOrganization.mockResolvedValueOnce(undefined);
      const mockLoggerError = vi.spyOn(logger, 'error');

      await expect(projectProcessor.format()).rejects.toThrow('Organization org-123 not found');
      expect(mockLoggerError).toHaveBeenCalledWith({
        requestId,
        resourceId,
        message: 'Organization org-123 not found',
      });
    });
  });
});
