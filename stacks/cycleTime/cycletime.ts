/* eslint-disable @typescript-eslint/ban-types */
import { Api, Function, StackContext } from 'sst/constructs';
import { initializeApi } from './api';

export function cycleTimeStack({ stack }: StackContext): {
  cycleTimeAPI: Api<{
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {
  const cycleTimeAPI = initializeApi(stack);
  stack.addOutputs({
    ApiEndpoint: cycleTimeAPI.url,
  });

  return {
    cycleTimeAPI,
  };
}
