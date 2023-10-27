import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { JiraClient } from '../../lib/jira-client';
import { BoardProcessor } from '../board';

// eslint-disable-next-line max-lines-per-function
describe('BoardProcessor', () => {
    let boardProcessor: BoardProcessor;
    let jiraClient: JiraClient;
    let apiData: Jira.Mapper.Board;

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
        boardProcessor = new BoardProcessor(apiData);
        jiraClient = {
            getBoard: vi.fn(),
        } as unknown as JiraClient;
        JiraClient.getClient = vi.fn().mockResolvedValue(jiraClient);
        boardProcessor.getOrganizationId = vi.fn().mockResolvedValue([{ orgId: 'org123', id: 'jira_org_org123' }]);
        boardProcessor.getParentId = vi.fn().mockResolvedValue('f2fd8d13-8bde-4ec0-bf87-4376fc2c8672');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should create a new instance of Board with the given properties', () => {
            const constructBoardProcessor = new BoardProcessor(apiData);
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
        it('should throw an error if organization is not found', async () => {
            const mockLoggerError = vi.spyOn(logger, 'error');
            boardProcessor.getOrganizationId = vi.fn().mockReturnValueOnce([]);
            await expect(boardProcessor.processor()).rejects.toThrow('Organization not found');
            expect(mockLoggerError).toHaveBeenCalledWith('Organization not found');
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