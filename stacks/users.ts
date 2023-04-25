import { StackContext, Api, Table } from 'sst/constructs';

export function usersStack({ stack }: StackContext) {
  const usersTable = new Table(stack, 'users', {
    fields: {
      email: 'string',
      password: 'string',
      firstName: 'string',
      lastName: 'string',
      gender: 'string',
    },
    primaryIndex: { partitionKey: 'email' },
  });
  const usersAPI = new Api(stack, 'usersAPI', {
    defaults: {
      function: {
        bind: [usersTable],
      },
    },
    routes: {
      'POST /users': 'packages/user-service/src/service/create-user.handler',
      'GET /users': 'packages/user-service/src/service/get-user-list.handler',
      'GET /users/{email}':
        'packages/user-service/src/service/get-user.handler',
      'DELETE /users/{email}':
        'packages/user-service/src/service/delete-user.handler',
      'PUT /users/{email}':
        'packages/user-service/src/service/update-user.handler',
    },
  });
  stack.addOutputs({
    ApiEndpoint: usersAPI.url,
  });
}
