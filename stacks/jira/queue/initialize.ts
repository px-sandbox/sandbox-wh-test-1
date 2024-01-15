import { Stack } from 'aws-cdk-lib';
import { Table, Queue } from 'sst/constructs';
import { initializeSprintQueue } from './sprint';
import { initializeProjectQueue } from './project';
import { initializeUserQueue } from './user';
import { initializeBoardQueue } from './board';
import { initializeIssueQueue } from './issue';
import { initializeIssueStatusQueue } from './issue-status';
import { initializeMigrateQueue } from './migrate';

// eslint-disable-next-line max-lines-per-function
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
    const [issueFormatter, issueIndexer, reOpenRateDataQueue, reOpenRateIndexQueue, reOpenRateMigratorQueue, reOpenRateDeleteQueue] =
        initializeIssueQueue(stack, {
            jiraMappingTable,
            jiraCredsTable,
            processJiraRetryTable,
        });

    const [issueStatusFormatter, issueStatusIndexer,] = initializeIssueStatusQueue(stack, {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
    });

    const [projectMigrateQueue,
        userMigrateQueue,
        sprintMigrateQueue,
        issueStatusMigrateQueue,
        issueMigrateQueue,
    ] = initializeMigrateQueue(
        stack,
        {
            jiraMappingTable,
            jiraCredsTable,
            processJiraRetryTable,
        },
        [
            projectFormatter,
            sprintFormatter,
            userFormatter,
            boardFormatter,
            issueFormatter,
            issueStatusFormatter
        ]
    );

    return {
        projectMigrateQueue,
        userMigrateQueue,
        sprintMigrateQueue,
        issueStatusMigrateQueue,
        issueMigrateQueue,
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
        issueStatusFormatter,
        issueStatusIndexer,
        reOpenRateDataQueue,
        reOpenRateIndexQueue,
        reOpenRateMigratorQueue,
        reOpenRateDeleteQueue
    };
}