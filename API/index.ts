import { StackContext, Api } from "sst/constructs";

export function API({ stack }: StackContext) {
  const api = new Api(stack, "api", {
    routes: {
      "POST /users": "packages/auth-service/src/service/create.handler",
      "GET /users": "packages/auth-service/src/service/get-list.handler",
      // "GET /users/{email}": "packages/auth-service/src/service/login.handler",
      // "DELETE /users/{email}": "packages/auth-service/src/service/login.handler",
      // "PUT /users/{email}": "packages/auth-service/src/service/login.handler",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
