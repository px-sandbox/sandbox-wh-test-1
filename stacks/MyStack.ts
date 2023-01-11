import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // Create the HTTP API

    const api = new sst.Api(this, "Api", {
      authorizers: {
        auth0: {
          type: "jwt",
          jwt: {
            issuer: process.env.AUTH0_DOMAIN + "/",
            audience: [process.env.AUTH0_DOMAIN + "/api/v2/"],
          },
        },
      },
      defaults: {
        authorizer: "auth0",
      },
      routes: {
        "GET /notes": {
          function: "src/list.handler",
          authorizer: "none",
        },
        "GET /notes/{id}": {
          function: "src/get.handler",
          authorizer: "none",
        },
        "PUT /notes/{id}": "src/update.handler",
      },
    });

    // Show the API endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
