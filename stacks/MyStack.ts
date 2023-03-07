import { StackContext, Api } from "sst/constructs";

export function API({ stack }: StackContext) {
  // Create User Pool
  // const auth = new Cognito(stack, "Auth", {
  //   login: ["email"],
  // });

  // const auth = new Auth(stack, "Auth", {
  //   authenticator: "functions/authenticator.handler",
  // });

  const api = new Api(stack, "api", {
    // authorizers: {
    //   auth0: {
    //     type: "jwt",
    //     jwt: {
    //       issuer: process.env.AUTH0_DOMAIN + "/",
    //       audience: [process.env.AUTH0_DOMAIN + "/api/v2/"],
    //     },
    //   },
    // },
    // defaults: {
    //   authorizer: "auth0",
    // },

    // authorizers: {
    //   jwt: {
    //     type: "user_pool",
    //     userPool: {
    //       id: auth.userPoolId,
    //       clientIds: [auth.userPoolClientId],
    //     },
    //   },
    // },
    // defaults: {
    //   authorizer: "jwt",
    // },
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
      "POST /signup": "packages/functions/src/signup.handler",
      // {
      //   function: "src/signup.handler",
      //   authorizer: "none",
      // },
      "GET /notes": "packages/functions/src/list.handler",
      // {
      //   function: "src/list.handler",
      //   authorizer: "none",
      // },
      "GET /notes/{id}": "packages/functions/src/get.handler",
      // {
      //   function: "src/get.handler",
      //   authorizer: "none",
      // },
      "PUT /notes/{id}": "packages/functions/src/update.handler",
    },
  });

  // auth.attach(stack, {
  //   api,
  // });
  // allowing authenticated users to access API
  // auth.attachPermissionsForAuthUsers(stack, [api]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
