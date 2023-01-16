import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // Create User Pool
    // const auth = new sst.Cognito(this, "Auth", {
    //   login: ["email"],
    // });

    // const auth = new sst.Auth(this, "Auth", {
    //   authenticator: "functions/authenticator.handler",
    // });

    // Create the HTTP API

    const api = new sst.Api(this, "Api", {
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
        "POST /signup": "src/signup.handler",
        // {
        //   function: "src/signup.handler",
        //   authorizer: "none",
        // },
        "GET /notes": "src/list.handler",
        // {
        //   function: "src/list.handler",
        //   authorizer: "none",
        // },
        "GET /notes/{id}": "src/get.handler",
        // {
        //   function: "src/get.handler",
        //   authorizer: "none",
        // },
        "PUT /notes/{id}": "src/update.handler",
      },
    });

    // auth.attach(this, {
    //   api,
    // });
    // allowing authenticated users to access API
    // auth.attachPermissionsForAuthUsers(this, [api]);

    // Show the API endpoint and other info in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      // UserPoolId: auth.userPoolId,
      // UserPoolClientId: auth.userPoolClientId,
    });
  }
}
