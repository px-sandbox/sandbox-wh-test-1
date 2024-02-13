/* eslint-disable @typescript-eslint/ban-types */
import { Api, Function, StackContext } from 'sst/constructs';
import { initializeApi } from './api';

export function pmStack({ stack }: StackContext): {
    pmAPI: Api<{
        universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    }>;
} {
    const pmAPI = initializeApi(stack);

    stack.addOutputs({
        ApiEndpoint: pmAPI.url,
    });

    return {
        pmAPI,
    };
}
