/* eslint-disable @typescript-eslint/ban-types */
import { Stack } from 'aws-cdk-lib';
import { Api, Function, use } from 'sst/constructs';
import { initializeRoutes } from './route';
import { commonConfig } from '../common/config';

export function initializeApi(
    stack: Stack,
): Api<{
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
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
        NODE_VERSION,
    } = use(commonConfig);
    const dpscAPI = new Api(stack, 'dpscAPI', {
        authorizers: {
            universal: {
                type: 'lambda',
                responseTypes: ['simple'],
                function: new Function(stack, 'universalAuth', {
                    handler: 'packages/auth/src/auth.handler',
                    bind: [AUTH_PUBLIC_KEY],
                    runtime: NODE_VERSION,
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

                ],
                runtime: NODE_VERSION,
            },
        },
        routes: initializeRoutes(),
    });

    return dpscAPI;
}