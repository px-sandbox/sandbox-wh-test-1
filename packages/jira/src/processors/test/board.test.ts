import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { JiraClient } from '../../lib/jira-client';
import { getOrganization } from '../../repository/organization/get-organization';
import { BoardProcessor } from '../board';

// eslint-disable-next-line max-lines-per-function
describe('BoardProcessor', () => {
    let boardProcessor: BoardProcessor;
    let jiraClient: JiraClient;
    let apiData: Jira.Mapper.Board;
    // let getOrganization: any;

    // adding requestId and
    let requestId :string;
    let resourceId :string;

    vi.mock('../../repository/organization/get-organization');
    beforeEach(() => {
        apiData = {
            id: 123,
            self: 'https://example.com/board/123',
            name: 'My Board',
            type: Jira.Enums.BoardType.Scrum,
            ranking: {
                rankCustomFieldId: 456,
            },
            organization: 'org 123',
            createdAt: '2022-01-01T00:00:00.000Z',
            isDeleted: false,
            deletedAt: null,
        };

        requestId = "this_is_requestId1";

        resourceId = "this is responseId1";
        boardProcessor = new BoardProcessor(apiData, requestId, resourceId);


        jiraClient = {
            getBoard: vi.fn(),
        } as unknown as JiraClient;
        JiraClient.getClient = vi.fn().mockResolvedValue(jiraClient);
        const mockOrgData = { orgId: 'org123', id: 'jira_org_org123' };
        getOrganization.mockResolvedValue(mockOrgData);
        // getOrganization = vi.fn().mockResolvedValue([{ orgId: 'org123', id: 'jira_org_org123' }]);
        boardProcessor.getParentId = vi.fn().mockResolvedValue('f2fd8d13-8bde-4ec0-bf87-4376fc2c8672');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create a new instance of Board with the given properties', () => {
            const constructBoardProcessor = new BoardProcessor(apiData, requestId, resourceId);
            expect(constructBoardProcessor).toEqual({ apiData });
        });
    });
    // eslint-disable-next-line max-lines-per-function
    describe('processor', () => {
        // eslint-disable-next-line max-lines-per-function
        it('should return a board object', async () => {
            jiraClient.getBoard = vi.fn().mockResolvedValueOnce({
                location: {
                    projectId: 'project123',
                    projectKey: 'PROJ',
                },
                type: Jira.Enums.BoardType.Scrum,
                ranking: {
                    rankCustomFieldId: 456,
                },
            });
            (getOrganization as vi.Mock).mockResolvedValueOnce({ orgId: 'org123', id: 'jira_org_org123' });
            const result = await boardProcessor.processor();
            expect(getOrganization).toHaveBeenCalledWith('org 123');
            expect(result).toEqual({
                id: 'f2fd8d13-8bde-4ec0-bf87-4376fc2c8672',
                body: {
                    id: 'jira_board_123',
                    boardId: 123,
                    self: 'https://example.com/board/123',
                    name: 'My Board',
                    type: Jira.Enums.BoardType.Scrum,
                    projectKey: 'PROJ',
                    projectId: 'jira_project_project123',
                    filter: null,
                    columnConfig: null,
                    ranking: {
                        rankCustomFieldId: 456,
                    },
                    organizationId: 'jira_org_org123',
                    createdAt: '2022-01-01T00:00:00.000Z',
                    isDeleted: false,
                    deletedAt: null,
                },
            });
        });
        it('should throw an error if organization is not found', async () => {
            const mockLoggerError = vi.spyOn(logger, 'error');
            (getOrganization as vi.Mock).mockResolvedValueOnce(undefined);
            // getOrganizationData = vi.fn().mockReturnValueOnce(undefined);
            // expect(getOrganization).toHaveBeenCalledWith('org 100');
            await expect(boardProcessor.processor()).rejects.toThrow('Organization org 123 not found');
            expect(mockLoggerError).toHaveBeenCalledWith('Organization org 123 not found');
        });

        it(`should return a board object with null filter and columnConfig
        if apiData does not have these properties`, async () => {
            delete apiData.filter;
            delete apiData.columnConfig;
            jiraClient.getBoard = vi.fn().mockResolvedValueOnce({
                location: {
                    projectId: 'project123',
                    projectKey: 'PROJ',
                },
                type: Jira.Enums.BoardType.Scrum,
                ranking: {
                    rankCustomFieldId: 456,
                },
            });
            const result = await boardProcessor.processor();
            expect(result).toEqual({
                id: 'f2fd8d13-8bde-4ec0-bf87-4376fc2c8672',
                body: {
                    id: 'jira_board_123',
                    boardId: 123,
                    self: 'https://example.com/board/123',
                    name: 'My Board',
                    type: Jira.Enums.BoardType.Scrum,
                    projectKey: 'PROJ',
                    projectId: 'jira_project_project123',
                    filter: null,
                    columnConfig: null,
                    ranking: {
                        rankCustomFieldId: 456,
                    },
                    organizationId: 'jira_org_org123',
                    createdAt: '2022-01-01T00:00:00.000Z',
                    isDeleted: false,
                    deletedAt: null,
                },
            });
        });

        it('should return a board object with null ranking if apiData does not have this property', async () => {
            delete apiData.ranking;
            jiraClient.getBoard = vi.fn().mockResolvedValueOnce({
                location: {
                    projectId: 'project123',
                    projectKey: 'PROJ',
                },
                type: Jira.Enums.BoardType.Scrum,
            });
            const result = await boardProcessor.processor();
            expect(result).toEqual({
                id: 'f2fd8d13-8bde-4ec0-bf87-4376fc2c8672',
                body: {
                    id: 'jira_board_123',
                    boardId: 123,
                    self: 'https://example.com/board/123',
                    name: 'My Board',
                    type: Jira.Enums.BoardType.Scrum,
                    projectKey: 'PROJ',
                    projectId: 'jira_project_project123',
                    filter: null,
                    columnConfig: null,
                    ranking: null,
                    organizationId: 'jira_org_org123',
                    createdAt: '2022-01-01T00:00:00.000Z',
                    isDeleted: false,
                    deletedAt: null,
                },
            });
        });

    });
});