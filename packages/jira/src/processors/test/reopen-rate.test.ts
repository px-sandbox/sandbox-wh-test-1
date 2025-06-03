import { Jira } from 'abstraction';
import { logger } from 'core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrganization } from '../../repository/organization/get-organization';
import { ReopenRateProcessor } from '../reopen-rate';

// Mock SST Config
vi.mock('sst/node/config', () => ({
  Config: {
    OPENSEARCH_NODE: 'test-node',
    OPENSEARCH_USERNAME: 'test-username',
    OPENSEARCH_PASSWORD: 'test-password',
  },
}));

// Mock ElasticSearchClient
vi.mock('@pulse/elasticsearch', () => ({
  ElasticSearchClient: {
    getInstance: vi.fn().mockReturnValue({
      search: vi.fn(),
      putDocument: vi.fn(),
      updateDocument: vi.fn(),
      updateByQuery: vi.fn(),
    }),
  },
}));

vi.mock('../../repository/organization/get-organization');
const mockGetOrganization = vi.mocked(getOrganization);

describe('ReopenRateProcessor', () => {
  let reopenRateProcessor: ReopenRateProcessor;
  let apiData: Jira.Mapped.ReopenRateIssue;
  let requestId: string;
  let resourceId: string;
  let retryProcessId: string;

  beforeEach(() => {
    apiData = {
      _id: '123',
      id: 'issue-123',
      self: 'https://jira.com/issue/123',
      key: 'PROJ-1',
      issueId: 'issue-123',
      projectKey: 'PROJ',
      organization: 'org-123',
      organizationId: 'org-123',
      sprintId: 'sprint-1',
      boardId: 'board-1',
      reOpenCount: 2,
      isReopen: true,
    };

    requestId = 'test-request-id';
    resourceId = 'test-resource-id';
    retryProcessId = 'test-retry-process-id';

    reopenRateProcessor = new ReopenRateProcessor(apiData, requestId, resourceId, retryProcessId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create a new instance of ReopenRateProcessor', () => {
      expect(reopenRateProcessor).toBeInstanceOf(ReopenRateProcessor);
    });
  });

  describe('format', () => {
    it('should format the reopen rate data correctly', async () => {
      const mockOrgData = { orgId: 'org123', _id: 'jira_org_org123' };

      mockGetOrganization.mockResolvedValueOnce(mockOrgData);

      vi.spyOn(reopenRateProcessor, 'parentId').mockResolvedValue('parent-id');

      await reopenRateProcessor.format();

      expect(getOrganization).toHaveBeenCalledWith(apiData.organization);
      expect(reopenRateProcessor.formattedData).toEqual({
        id: 'parent-id',
        body: {
          id: 'jira_reopen_rate_issue-123_jira_sprint_sprint-1',
          sprintId: 'jira_sprint_sprint-1',
          projectId: 'jira_project_issue-123',
          projectKey: 'PROJ',
          issueId: 'jira_issue_issue-123',
          issueKey: 'PROJ-1',
          reOpenCount: 2,
          isReopen: true,
          organizationId: 'jira_org_org123',
          boardId: 'jira_board_board-1',
          isDeleted: false,
          deletedAt: null,
        },
      });
    });

    it('should throw an error if organization is not found', async () => {
      mockGetOrganization.mockResolvedValueOnce(undefined);
      const mockLoggerError = vi.spyOn(logger, 'error');

      await expect(reopenRateProcessor.format()).rejects.toThrow('Organization org-123 not found');
      expect(mockLoggerError).toHaveBeenCalledWith({
        requestId,
        resourceId,
        message: 'Organization org-123 not found',
      });
    });

    it('should handle empty reOpenCount gracefully', async () => {
      const modifiedApiData = { ...apiData, reOpenCount: 0, isReopen: false };

      const processor = new ReopenRateProcessor(
        modifiedApiData,
        requestId,
        resourceId,
        retryProcessId
      );
      const mockOrgData = { orgId: 'org123', _id: 'jira_org_org123' };

      mockGetOrganization.mockResolvedValueOnce(mockOrgData);
      vi.spyOn(processor, 'parentId').mockResolvedValue('parent-id');

      await processor.format();

      expect(processor.formattedData.body.reOpenCount).toBe(0);
      expect(processor.formattedData.body.isReopen).toBe(false);
    });
  });
});
