import { Jira } from 'abstraction';
import { logger } from 'core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrganization } from '../../repository/organization/get-organization'; // Adjust the path
import { SprintProcessor } from '../sprint'; // Adjust the path to the actual file

// Mock SST Config
vi.mock('sst/node/config', () => ({
  Config: {
    OPENSEARCH_NODE: 'mock-node',
    OPENSEARCH_USERNAME: 'mock-username',
    OPENSEARCH_PASSWORD: 'mock-password',
    REQUEST_TIMEOUT: 30000,
  },
}));

// Mock ElasticSearchClient
vi.mock('@pulse/elasticsearch', () => ({
  ElasticSearchClient: {
    getInstance: vi.fn().mockReturnValue({
      search: vi.fn(),
      queryAggs: vi.fn(),
      putDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteByQuery: vi.fn(),
      updateByQuery: vi.fn(),
      paginateSearch: vi.fn(),
      bulkInsert: vi.fn(),
      bulkUpdate: vi.fn(),
      isIndexExists: vi.fn(),
      updateIndex: vi.fn(),
      createIndex: vi.fn(),
    }),
  },
}));

// Mocking external dependencies
vi.mock('../../repository/organization/get-organization'); // Mocking getOrganization
vi.mock('../lib/jira-client'); // Mocking JiraClient
vi.mock('core', () => ({
  logger: { error: vi.fn() }, // Mock logger's error function
}));

describe('SprintProcessor', () => {
  let sprintProcessor: SprintProcessor;
  let apiData: Jira.ExternalType.Webhook.Sprint;
  let requestId: string;
  let resourceId: string;

  beforeEach(() => {
    // Mock input data
    apiData = {
      id: '123',
      self: 'self-url',
      state: 'active',
      name: 'Sprint 1',
      createdDate: '2023-10-01T00:00:00Z',
      startDate: '2023-10-02T00:00:00Z',
      endDate: '2023-10-10T00:00:00Z',
      completeDate: '2023-10-09T00:00:00Z',
      originBoardId: 1,
      isDeleted: false,
      deletedAt: '2023-10-09T00:00:00Z',
      organization: 'org-123',
    };

    requestId = 'test-request-id';
    resourceId = 'test-resource-id';

    sprintProcessor = new SprintProcessor(apiData, requestId, resourceId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('format', () => {
    it('should throw an error if organization is not found', async () => {
      // Mock organization data to return undefined
      vi.mocked(getOrganization).mockResolvedValueOnce(undefined);

      // Mock logger error function
      const mockLoggerError = vi.spyOn(logger, 'error');

      // Call the format method and expect an error
      await expect(sprintProcessor.format()).rejects.toThrow(
        `Organization ${apiData.organization} not found`
      );

      // Assert that logger.error was called
      expect(mockLoggerError).toHaveBeenCalledWith({
        requestId,
        resourceId,
        message: `Organization ${apiData.organization} not found`,
      });
    });
  });
});
