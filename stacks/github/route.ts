import { ApiRouteProps, Queue } from 'sst/constructs';
import { GithubTables } from '../type/tables';

// eslint-disable-next-line max-lines-per-function
export function initializeRoutes(
    queues: { [key: string]: Queue },
    githubDDb: GithubTables
): Record<string, ApiRouteProps<'universal' | 'admin'>> {

    /* We are extracting the queues from the queues object 
     * and bind them to their respective functions/handlers called within routes */
    const {
        userFormatDataQueue,
        repoFormatDataQueue,
        branchFormatDataQueue,
        commitFormatDataQueue,
        pushFormatDataQueue,
        prFormatDataQueue,
        prReviewCommentFormatDataQueue,
        prReviewFormatDataQueue,
        collectPRData,
        historicalBranch,
        depRegistryQueue,
        currentDepRegistryQueue,
        latestDepRegistry,
        repoSastErrors,
        scansSaveQueue
    } = queues;

    /* We aso extract and bind the tables 
     * from the githubDDb object to their respective functions/handlers called within routes */
    const { retryProcessTable, githubMappingTable, libMasterTable } = githubDDb;
    return {
        // GET Metadata route
        'GET /github/metadata': {
            function: {
                handler: 'packages/github/src/service/get-metadata.handler',
                timeout: '15 minutes',
                bind: [userFormatDataQueue, repoFormatDataQueue, githubMappingTable],
            },
            authorizer: 'admin',
        },
        // GET github installation access token
        'GET /github/installation-access-token': {
            function: 'packages/github/src/service/installation-access-token.handler',
            authorizer: 'admin',
        },
        // GET github Oauth token
        'GET /github/auth-token': {
            function: 'packages/github/src/service/jwt-token.getOauthToken',
            authorizer: 'admin',
        },
        // GET Github app installations
        'GET /github/app/installations': {
            function: 'packages/github/src/service/github-app-installation-list.handler',
            authorizer: 'admin',
        },
        // POST Webhook handler
        'POST /github/webhook': {
            function: {
                handler: 'packages/github/src/service/webhook.webhookData',
                bind: [
                    userFormatDataQueue,
                    repoFormatDataQueue,
                    branchFormatDataQueue,
                    commitFormatDataQueue,
                    pushFormatDataQueue,
                    prFormatDataQueue,
                    prReviewCommentFormatDataQueue,
                    prReviewFormatDataQueue,
                ],
            },
            authorizer: 'none',
        },

        // POST handle repository's libraries info 
        'POST /github/repo-libraries': {
            function: {
                handler: 'packages/github/src/service/repo-library/repo-library.handler',
                bind: [depRegistryQueue, currentDepRegistryQueue, latestDepRegistry],
            },
            authorizer: 'none',
        },

        // GET Github Branches data
        'GET /github/branches': {
            function: 'packages/github/src/service/get-branches.handler',
            authorizer: 'universal',
        },

        // GET Technical Success Criteria metrics
        'GET /github/graph/version-upgrades': {
            function: {
                handler: 'packages/github/src/service/version-upgrades.handler',
                bind: [libMasterTable],
            },
            authorizer: 'universal',

        },

        // GET Technical Success Criteria metrics
        'GET /github/graph/product-security': {
            function: {
                handler: 'packages/github/src/service/product-security.handler',
            },
            authorizer: 'universal',

        },

        // GET Historical Data
        'GET /github/history': {
            function: {
                handler: 'packages/github/src/service/history-data.handler',
                bind: [collectPRData, historicalBranch],
            },
        },

        // GET github data ingestion failed retry
        // bind all the queues and tables needed to the retry-process.handler
        'GET /github/retry/failed': {
            function: {
                handler: 'packages/github/src/cron/retry-process.handler',
                bind: [
                    retryProcessTable,
                    userFormatDataQueue,
                    repoFormatDataQueue,
                    branchFormatDataQueue,
                    commitFormatDataQueue,
                    pushFormatDataQueue,
                    prFormatDataQueue,
                    prReviewCommentFormatDataQueue,
                    prReviewFormatDataQueue,
                    depRegistryQueue,
                    currentDepRegistryQueue,
                    repoSastErrors,
                    scansSaveQueue
                ],
            },
        },

        // GET create all ES indices
        'GET /github/create-indices': {
            function: 'packages/github/src/service/create-indices.handler',
        },

        'GET /github/file-changes-of-commit': {
            function: 'packages/github/src/service/file-changes-of-commit.handler',
            authorizer: 'universal',
        },
        'GET /github/version-upgrade-headline': {
            function: {
                handler: 'packages/github/src/service/get-version-upgrade-headline.handler',
                bind: [libMasterTable]
            },
            authorizer: 'universal',
        },
        'POST /github/repo-sast-errors': {
            function: {
                handler: 'packages/github/src/service/repo-sast-errors.handler',
                bind: [repoSastErrors]
            },
            authorizer: 'none',
        },

        // Cron to create security scans for today, if there aren't any, based on yesterday's data
        'POST /github/cron/update-security-scans': {

            function: {
                handler: 'packages/github/src/service/update-security-scans.handler',
                bind: [scansSaveQueue]
            },
            authorizer: 'none',
        },

        // GET github branches list from ES
        'GET /github/branch-list': {
            function: {
                handler: 'packages/github/src/migrations/branch-protected.handler',
                timeout: '15 minutes',
                bind: [repoFormatDataQueue, branchFormatDataQueue],
            },
            authorizer: 'admin',
        },
        'GET /github/graph/product-security/detail': {
            function: {
                handler: 'packages/github/src/service/repo-sast-errors-details.handler',
            },
            authorizer: 'universal',
        },

    }
}