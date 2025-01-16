/* eslint-disable @typescript-eslint/ban-types */
import { Api, Function, StackContext } from 'sst/constructs';
import { initializeApi } from './api';

export function tpscStack({ stack }: StackContext): {
  tpscAPI: Api<{
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {
  const tpscAPI = initializeApi(stack);
  stack.addOutputs({
    ApiEndpoint: tpscAPI.url,
  });

  return {
    tpscAPI,
  };
}
