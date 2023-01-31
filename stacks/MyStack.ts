import * as sst from "@serverless-stack/resources";
import { config } from "winston";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    //Set config params
    // const githubAppId = new sst.Topic(this, "GithubAppId");
    const GITHUB_APP_ID = new sst.Config.Secret(this, "GITHUB_APP_ID");
    const GITHUB_APP_PRIVATE_KEY_PEM = new sst.Config.Secret(
      this,
      "GITHUB_APP_PRIVATE_KEY_PEM"
    );
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

    api.addRoutes(this, {
      "GET /auth-token": {
        function: {
          handler: "github/jwtToken.handler",
          bind: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PEM],
        },
      },
      "GET /app": "github/app.handler",
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
