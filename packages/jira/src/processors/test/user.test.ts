import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { JiraClient } from '../../lib/jira-client';
import { UserProcessor } from '../user';

// eslint-disable-next-line max-lines-per-function
describe('UserProcessor', () => {
    let jiraClient: JiraClient;
    let userProcessor: UserProcessor;
    let apiData: Jira.Mapper.User;
    const user: Jira.Mapper.User = {
        self: 'https://example.com/user123',
        accountId: 'user123',
        accountType: Jira.Enums.UserType.Atlassian,
        emailAddress: 'user@example.com',
        displayName: 'User Example',
        avatarUrls: {
            '48x48': 'https://example.com/avatar48.png',
            '32x32': 'https://example.com/avatar32.png',
            '24x24': 'https://example.com/avatar24.png',
            '16x16': 'https://example.com/avatar16.png',
        },
        active: true,
        timeZone: 'America/New_York',
        isDeleted: false,
        deletedAt: null,
        createdAt: '2022-01-01T00:00:00.000Z',
        organization: 'org 123',
    };
    beforeEach(() => {
        apiData = user;
        userProcessor = new UserProcessor(apiData);
        jiraClient = {
            getUser: vi.fn(),
        } as unknown as JiraClient;
        JiraClient.getClient = vi.fn().mockResolvedValue(jiraClient);
        userProcessor.getOrganizationId = vi.fn().mockResolvedValue([{ orgId: 'org123', id: 'jira_org_org123' }]);
        userProcessor.getParentId = vi.fn().mockResolvedValue('f2fd8d13-8bde-4ec0-bf87-4376fc2c8672');

    });
    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create a new instance of User with the given properties', () => {
            const constructUserProcessor = new UserProcessor(apiData);
            expect(constructUserProcessor).toEqual({ apiData });
        });
    });


    // eslint-disable-next-line max-lines-per-function
    describe('processor', async () => {

        it('should throw an error if organization is not found', async () => {
            const mockLoggerError = vi.spyOn(logger, 'error');
            userProcessor.getOrganizationId = vi.fn().mockReturnValue([]);
            await expect(userProcessor.processor()).rejects.toThrow('Organization not found');
            expect(mockLoggerError).toHaveBeenCalledWith('Organization not found');
        });
        // eslint-disable-next-line max-lines-per-function
        it('should return a user object with correct properties', async () => {
            jiraClient.getUser = vi.fn().mockResolvedValue({
                ...user,
                groups: null,
                applicationRoles: null,
            });
            const result = await userProcessor.processor();
            expect(result.body.id).toBeDefined();
            expect(result.body.userId).toBeDefined();
            expect(result.body.userType).toBeDefined();
            expect(result.body.emailAddress).toBeDefined();
            expect(result.body.displayName).toBeDefined();
            expect(result.body.avatarUrls).toBeDefined();
            expect(result.body.isActive).toBeDefined();
            expect(result.body.groups).toBeDefined();
            expect(result.body.applicationRoles).toBeDefined();
            expect(result.body.isDeleted).toBeDefined();
            expect(result.body.deletedAt).toBeDefined();
            expect(result.body.createdAt).toBeDefined();
            expect(result.body.organizationId).toBeDefined();
            expect(result).toEqual({
                id: 'f2fd8d13-8bde-4ec0-bf87-4376fc2c8672',
                body: {
                    id: 'jira_user_user123',
                    userId: 'user123',
                    userType: Jira.Enums.UserType.Atlassian,
                    emailAddress: 'user@example.com',
                    displayName: 'User Example',
                    avatarUrls: {
                        avatarUrl48x48: 'https://example.com/avatar48.png',
                        avatarUrl32x32: 'https://example.com/avatar32.png',
                        avatarUrl24x24: 'https://example.com/avatar24.png',
                        avatarUrl16x16: 'https://example.com/avatar16.png',
                    },
                    groups: null,
                    applicationRoles: null,
                    isActive: true,
                    isDeleted: false,
                    deletedAt: null,
                    createdAt: '2022-01-01T00:00:00.000Z',
                    organizationId: 'jira_org_org123',
                },
            });
        });

        it('should handle missing parent ID', async () => {
            userProcessor.getParentId = vi.fn().mockResolvedValue('');
            const result = await userProcessor.processor();
            expect(result.id).not.toBe('f2fd8d13-8bde-4ec0-bf87-4376fc2c8672');
            expect(result).toEqual({
                id: expect.any(String),
                body: {
                    id: 'jira_user_user123',
                    userId: 'user123',
                    userType: 'atlassian',
                    emailAddress: 'user@example.com',
                    displayName: 'User Example',
                    avatarUrls: {
                        avatarUrl48x48: 'https://example.com/avatar48.png',
                        avatarUrl32x32: 'https://example.com/avatar32.png',
                        avatarUrl24x24: 'https://example.com/avatar24.png',
                        avatarUrl16x16: 'https://example.com/avatar16.png',
                    },
                    isActive: true,
                    groups: null,
                    applicationRoles: null,
                    isDeleted: false,
                    deletedAt: null,
                    createdAt: '2022-01-01T00:00:00.000Z',
                    organizationId: 'jira_org_org123',
                },
            });
        });
    });
});