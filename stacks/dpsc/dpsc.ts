/* eslint-disable @typescript-eslint/ban-types */
import { Api, Function, StackContext } from 'sst/constructs';
import { initializeApi } from './api';

export function dpscStack({ stack }: StackContext): {
    dpscAPI: Api<{
        universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    }>;
} {



    const dpscAPI = initializeApi(stack);

    stack.addOutputs({
        ApiEndpoint: dpscAPI.url,
    });

    return {
        dpscAPI,
    };
}
