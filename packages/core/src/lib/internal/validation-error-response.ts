/* eslint-disable @typescript-eslint/no-explicit-any */
import middy from '@middy/core';

export const ValidationErrorResponse = {
  onError: (request: middy.Request<unknown, any, Error, any>): void => {
    const { response } = request;
    if (response) {
      const { error } = request;
      if (response.statusCode !== 400) return;
      if (!error || !error.cause) return;
      response.headers['Content-Type'] = 'application/json';
      response.body = JSON.stringify({
        message: response.body,
        data: error.cause,
      });
    }
  },
};
