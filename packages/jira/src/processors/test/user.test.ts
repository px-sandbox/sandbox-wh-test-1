import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { UserProcessor } from '../user';
import { getOrganization } from '../../repository/organization/get-organization';
import { JiraClient } from '../../lib/jira-client';
import { UserType } from 'abstraction/jira/enums';

vi.mock('../../repository/organization/get-organization');
vi.mock('../../lib/jira-client');

const mockGetOrganization = vi.mocked(getOrganization);

describe('UserProcessor', () => {
  let userProcessor: UserProcessor;
  let apiData: Jira.Mapper.User;
  let requestId: string;
  let resourceId: string;

  beforeEach(() => {
    apiData = {
      self: 'self-url',
      accountId: 'user-123',
      avatarUrls: {
        '48x48': 'avatar48',
        '32x32': 'avatar32',
        '24x24': 'avatar24',
        '16x16': 'avatar16',
      },
      displayName: 'John Doe',
      active: true,
      timeZone: 'UTC',
      accountType: UserType.Atlassian,
      emailAddress: 'john.doe@example.com',
      groups: { size: 1, items: [{ name: 'group1' }] },
      applicationRoles: { size: 1, items: [{ name: 'role1' }] },
      organization: 'org-123',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };

    requestId = 'test-request-id';
    resourceId = 'test-resource-id';

    userProcessor = new UserProcessor(apiData, requestId, resourceId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('format', () => {
    it('should throw an error if organization is not found', async () => {
      mockGetOrganization.mockResolvedValueOnce(undefined);
      const mockLoggerError = vi.spyOn(logger, 'error');

      await expect(userProcessor.format()).rejects.toThrow('Organization org-123 not found');
      expect(mockLoggerError).toHaveBeenCalledWith({
        requestId,
        resourceId,
        message: 'Organization org-123 not found',
      });
    });
  });
});
