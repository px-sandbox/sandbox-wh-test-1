import { Stack } from 'aws-cdk-lib';
import { Table, Queue } from 'sst/constructs';
import { initializeSprintQueue } from './sprint';
import { initializeProjectQueue } from './project';
import { initializeUserQueue } from './user';
import { initializeBoardQueue } from './board';
import { initializeIssueQueue } from './issue';
import { initializeMigrateQueue } from './migrate';

export function initializeQueues(
    stack: Stack,
    jiraMappingTable: Table,
    jiraCredsTable: Table,
    processJiraRetryTable: Table
): Record<string, Queue> {

    const [sprintFormatter, sprintIndexer] = initializeSprintQueue(stack, {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
    });
    const [projectFormatter, projectIndexer] = initializeProjectQueue(stack, {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
    });
    const [userFormatter, userIndexer] = initializeUserQueue(stack, {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
    });
    const [boardFormatter, boardIndexer] = initializeBoardQueue(stack, {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
    });
    const [issueFormatter, issueIndexer] = initializeIssueQueue(stack, {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
    });

    const [projectMigrateQueue,
        sprintMigrateQueue,
        issueMigrateQueue,
        userMigrateQueue] = initializeMigrateQueue(
            stack,
            {
                jiraMappingTable,
                jiraCredsTable,
                processJiraRetryTable,
            },
            [projectFormatter, sprintFormatter, userFormatter, boardFormatter, issueFormatter]
        );

    return {
        projectMigrateQueue,
        sprintMigrateQueue,
        issueMigrateQueue,
        userMigrateQueue,
        sprintFormatter,
        sprintIndexer,
        projectFormatter,
        projectIndexer,
        userFormatter,
        userIndexer,
        boardFormatter,
        boardIndexer,
        issueFormatter,
        issueIndexer,
    };
}