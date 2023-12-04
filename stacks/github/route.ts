import { ApiRouteProps, Queue } from 'sst/constructs';
import { GithubTables } from '../type/tables';

// eslint-disable-next-line max-lines-per-function
export function initializeRoutes(
    queues: { [key: string]: Queue },
    githubDDb: GithubTables
): Record<string, ApiRouteProps<'universal' | 'admin'>> {
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
        repoSastScans
    } = queues;
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
        // GET GithubUser data
        'GET /github/user/{githubUserId}': {
            function: 'packages/github/src/service/get-user.handler',
            authorizer: 'universal',
        },
        // GET GithubRepo data
        'GET /github/repositories': {
            function: 'packages/github/src/service/get-repo.handler',
            authorizer: 'universal',
        },

        // GET Github Branches data
        'GET /github/branches': {
            function: 'packages/github/src/service/get-branches.handler',
            authorizer: 'universal',
        },

        // GET PR comments graph data
        'GET /github/graph/number-comments-added-to-prs': {
            function: 'packages/github/src/service/get-pr-comment.handler',
            authorizer: 'universal',
        },
        // GET Graph for frequency of code commits
        'GET /github/graph/code-commit-frequency': {
            function: 'packages/github/src/service/get-commit-frequency.handler',
            authorizer: 'universal',
        },
        // GET Graph for number of PRs
        'GET /github/graph/number-pr-raised': {
            function: 'packages/github/src/service/pr-raised-count.handler',
            authorizer: 'universal',
        },

        // GET Graph for PRs review time
        'GET /github/graph/pr-wait-time': {
            function: 'packages/github/src/service/pr-wait-time.handler',
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

        // GET Historical Data
        'GET /github/history': {
            function: {
                handler: 'packages/github/src/service/history-data.handler',
                bind: [collectPRData, historicalBranch],
            },
        },

        // GET github data ingestion failed retry
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
                    currentDepRegistryQueue
                ],
            },
        },

        // GET create all ES indices
        'GET /github/create-indices': {
            function: 'packages/github/src/service/create-indices.handler',
        },

        // GET github active number of branches
        'GET /github/graph/number-of-branches': {
            function: 'packages/github/src/service/active-branches.handler',
            authorizer: 'universal',
        },

        'GET /github/graph/number-of-branches-by-repo': {
            function: 'packages/github/src/cron/branch-counter.handler',
        },

        // GET Graph for avg lines of code per day per developer
        'GET /github/graph/lines-of-code': {
            function: 'packages/github/src/service/get-lines-of-code.handler',
            authorizer: 'universal',
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
        'GET /github/repo-sast-scans': {
            function: {
                handler: 'packages/github/src/service/repo-sast-scans.handler',
                bind: [repoSastScans]
            },
            authorizer: 'universal',
        }
    };
}
