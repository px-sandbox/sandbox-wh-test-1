import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { IssueStatusProcessor } from '../issue-status'; 
import { getOrganization } from '../../repository/organization/get-organization';
import { ElasticSearchClient } from '@pulse/elasticsearch';

vi.mock('../../repository/organization/get-organization');
vi.mock('@pulse/elasticsearch', () => ({
  ElasticSearchClient: {
    getInstance: vi.fn().mockReturnValue({
      search: vi.fn(),
      putDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteByQuery: vi.fn(),
      updateByQuery: vi.fn(),
      paginateSearch: vi.fn(),
      queryAggs: vi.fn(),
      isIndexExists: vi.fn(),
      updateIndex: vi.fn(),
      createIndex: vi.fn(),
    }),
  },
}));

const mockGetOrganization = vi.mocked(getOrganization);

describe('IssueStatusProcessor', () => {
  let issueStatusProcessor: IssueStatusProcessor;
  let apiData: Jira.ExternalType.Api.IssueStatus;
  let requestId: string;
  let resourceId: string;

  beforeEach(() => {
    apiData = {
      id: '123',
      name: 'To Do',
      statusCategory: 'New',
      scope: {
        type: 'project',
      },
      description: 'Task to be done',
      organization: 'org-123',
    };

    requestId = 'test-request-id';
    resourceId = 'test-resource-id';

    issueStatusProcessor = new IssueStatusProcessor(apiData, requestId, resourceId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create a new instance of IssueStatusProcessor', () => {
      expect(issueStatusProcessor).toBeInstanceOf(IssueStatusProcessor);
    });
  });

  describe('process', () => {
    it('should call format', async () => {
      const formatSpy = vi.spyOn(issueStatusProcessor, 'format').mockResolvedValue();

      await issueStatusProcessor.process();

      expect(formatSpy).toHaveBeenCalled();
    });
  });

  describe('format', () => {
    it('should format the issue status data correctly', async () => {
      const mockOrgData = { orgId: 'org123',_id: 'jira_org_org123' };

      mockGetOrganization.mockResolvedValueOnce(mockOrgData);

      vi.spyOn(issueStatusProcessor, 'getParentId').mockResolvedValue('parent-id');

      await issueStatusProcessor.format();

      expect(getOrganization).toHaveBeenCalledWith(apiData.organization);
      expect(issueStatusProcessor.formattedData).toEqual({
        id: 'parent-id',
        body: {
          id: 'jira_issue_status_123',
          issueStatusId: '123',
          name: 'To Do',
          status: 'New',
          organizationId: undefined,
          pxStatus: null,
        },
      });
    });

    it('should throw an error if organization is not found', async () => {
      mockGetOrganization.mockResolvedValueOnce(undefined);
      const mockLoggerError = vi.spyOn(logger, 'error');

      await expect(issueStatusProcessor.format()).rejects.toThrow('Organization org-123 not found');
      expect(mockLoggerError).toHaveBeenCalledWith({
        requestId,
        resourceId,
        message: 'Organization org-123 not found',
      });
    });
  });
});
