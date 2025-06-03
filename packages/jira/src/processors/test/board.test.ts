import { beforeEach, afterEach, expect, it, describe, vi, Mock } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { JiraClient } from '../../lib/jira-client';
import { getOrganization } from '../../repository/organization/get-organization';
import { BoardProcessor } from '../board';

vi.mock('../../repository/organization/get-organization', () => ({
    getOrganization: vi.fn()
}));

vi.mock('@pulse/elasticsearch', () => ({
    ElasticSearchClient: {
        getInstance: vi.fn()
    }
}));

// eslint-disable-next-line max-lines-per-function
describe('BoardProcessor', () => {
    let boardProcessor: BoardProcessor;
    let jiraClient: JiraClient;
    let apiData: Jira.Mapper.Board;
    let requestId: string;
    let resourceId: string;

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
        (getOrganization as Mock).mockResolvedValue(mockOrgData);
        boardProcessor.getParentId = vi.fn().mockResolvedValue('f2fd8d13-8bde-4ec0-bf87-4376fc2c8672');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create a new instance of Board with the given properties', () => {
            const constructBoardProcessor = new BoardProcessor(apiData, requestId, resourceId);
            expect(constructBoardProcessor).toBeInstanceOf(BoardProcessor);
            expect(constructBoardProcessor.formattedData).toEqual({});
        });
    });

    describe('process', () => {
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
            (getOrganization as Mock).mockResolvedValueOnce({ orgId: 'org123', id: 'jira_org_org123' });
            await boardProcessor.process();
            expect(getOrganization).toHaveBeenCalledWith('org 123');
            expect(boardProcessor.formattedData).toEqual({
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
            (getOrganization as Mock).mockResolvedValueOnce(undefined);
            await expect(boardProcessor.process()).rejects.toThrow('Organization org 123 not found');
            expect(mockLoggerError).toHaveBeenCalledWith({
                requestId,
                resourceId,
                message: 'Organization org 123 not found'
            });
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
            await boardProcessor.process();
            expect(boardProcessor.formattedData).toEqual({
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
            await boardProcessor.process();
            expect(boardProcessor.formattedData).toEqual({
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