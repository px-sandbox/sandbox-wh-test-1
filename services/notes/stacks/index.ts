import { Api, StackContext } from 'sst/constructs';
import { notesRoutes } from '../routes';

export function API({ stack }: StackContext) {
  // Create User Pool
  // const auth = new Cognito(stack, "Auth", {
  //   login: ["email"],
  // });

  // const auth = new Auth(stack, "Auth", {
  //   authenticator: "functions/authenticator.handler",
  // });

  const api = new Api(stack, 'api', {
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
    routes: notesRoutes,
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
