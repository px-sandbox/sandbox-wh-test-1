import { Stack } from 'aws-cdk-lib';
import { Api, Function, Queue, use } from 'sst/constructs';
import { initializeRoutes } from './route';
import { commonConfig } from '../common/config';
import { GithubTables } from '../type/tables';

// eslint-disable-next-line max-lines-per-function,
export function initializeApi(
    stack: Stack,
    queue: { [key: string]: Queue },
    githubDDb: GithubTables
): Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
}> {
    const {
        AUTH_PUBLIC_KEY,
        GITHUB_APP_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_BASE_URL,
        GITHUB_SG_ACCESS_TOKEN,
        GITHUB_SG_INSTALLATION_ID,
        GITHUB_WEBHOOK_SECRET,
        GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    } = use(commonConfig);
    const ghAPI = new Api(stack, 'api', {
        authorizers: {
            universal: {
                type: 'lambda',
                responseTypes: ['simple'],
                function: new Function(stack, 'fnUniversalAuth', {
                    handler: 'packages/auth/src/auth.handler',
                    bind: [AUTH_PUBLIC_KEY],
                }),
            },
            admin: {
                type: 'lambda',
                responseTypes: ['simple'],
                function: new Function(stack, 'fnAdminAuth', {
                    handler: 'packages/auth/src/admin-auth.handler',
                    bind: [AUTH_PUBLIC_KEY],
                }),
            },
        },
        defaults: {
            authorizer: 'universal',
            function: {
                timeout: '30 seconds',
                bind: [
                    GITHUB_APP_ID,
                    GITHUB_APP_PRIVATE_KEY_PEM,
                    GITHUB_BASE_URL,
                    GITHUB_SG_ACCESS_TOKEN,
                    GITHUB_SG_INSTALLATION_ID,
                    GITHUB_WEBHOOK_SECRET,
                    GIT_ORGANIZATION_ID,
                    OPENSEARCH_NODE,
                    OPENSEARCH_PASSWORD,
                    OPENSEARCH_USERNAME,

                ]
            },
        },
        routes: initializeRoutes(queue, githubDDb),
    });

    return ghAPI;
}