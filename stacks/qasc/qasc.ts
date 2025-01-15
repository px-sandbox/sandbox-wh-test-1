/* eslint-disable @typescript-eslint/ban-types */
import { Api, Function, StackContext } from 'sst/constructs';
import { initializeApi } from './api';

export function qascStack({ stack }: StackContext): {
  qascAPI: Api<{
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {
  const qascAPI = initializeApi(stack);
  stack.addOutputs({
    ApiEndpoint: qascAPI.url,
  });

  return {
    qascAPI,
  };
}
