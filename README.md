# Serverless with SST

Boilerplate for SST serverless APIs

## File and folder Naming conventions

- Folder and file name will be singular and follow `kebab-case`
- Classes and interfaces Names will be singular and follow `PascalCasing`
- Any global constants or environment variables are in `all-caps` and follow `SNAKE_CASE`
- Variable name should be `camelCase`

For more details onto casing refer [here](https://medium.com/better-programming/string-case-styles-camel-pascal-snake-and-kebab-case-981407998841)

## Monorepo architecture

This structure segregates the services as micro-services and other modules like `core` as the code sharing and in support to micro-services. `core` will be used as a package in micro-services.

```
.
├── packages
│    ├── core
│    │    ├── src
│    │    |   ├── constant # contain files for declaring constants
|    |    |   |   ├── config.ts
│    │    |   ├── lib
│    │    │   |   ├── # folders and files for code shareability
│    │    ├── index.ts # export types or helping functions
│    │    ├── package.json
│    │    ├── tsconfig.json
│    ├── sample-service1
│    │    ├── src
│    │    |   ├── abstraction # contain files for types, interfaces
│    │    |   ├── constant # contain files for declaring constants
|    |    |   |   ├── config.ts
│    │    |   ├── service
│    │    |   |   ├── validation # folder to hold validations for your API
│    │    │   |   ├── sample-function.ts # functions to use your service
│    │    |   ├── test # contain test for the handlers of lambda
│    │    ├── package.json
│    │    ├── tsconfig.json
│    │    ├── jest.config.js
|
├── stacks
│    ├── my-stack.ts # example
│    ├── storage.ts # example
|
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── ...
```

## Create New Service

- Create a new folder in `packages` with above recommended structure
- Create a new file in `stacks` for API map and any other AWS infra req.
- import the new stack in `sst.confi.ts`

Your `sst.config.ts` should be like this:

```typescript
import { SSTConfig } from 'sst';
import { API } from './stacks/my-stack';
import { Storage } from './stacks/storage';

export default {
  config(_input) {
    return {
      name: 'rest-api-ts', // name of your app
      region: 'us-east-1', // desired aws region
    };
  },
  stacks(app) {
    app.stack(API);
    app.stack(Storage);
  },
} satisfies SSTConfig;
```

## Create New API

1. Create a new handler in respective service's folder (packages/<service>/service/<new handler file>.ts).
   This handler will contain the logic for your API and invoke the validations.

```typescript
import { APIHandler } from 'core';

const createUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // your logic goes here that handles event and responds
};

const handler = APIHandler(createUser, {
  eventSchema: transpileSchema(createUserSchema),
});
```

2. if your API requires a validation then create a validation object in adjacent validation folder. The validation object for above example will look like

```typescript
export const createUserSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
      },
      required: ['email', 'password', 'firstName', 'lastName'],
    },
  },
};
```

we are using [ajv](https://ajv.js.org/) for validations.

3. create an entry in routes of your service's stack.

```typescript
const usersAPI = new Api(stack, 'usersAPI', {
  routes: {
    '<HTTP-VERB> /<route>': {
      function: {
        handler: '<path to handler file>',
      },
    },
    '<HTTP-VERB> /<route>': '<path to handler file>',
  })
```

## Deploy Application

- Install node 16._ and npm 8._
- Setup aws credentials by exporting the credentials on terminal.

**Check by command if token is expired**

```
aws sts get-caller-identity
```

**Note:** If token expired then again need to be export the credentials on the terminal.

Add these scripts in the package.json file of the service:

```
	"scripts": {
		"dev": "sst dev",
		"build": "sst build",
		"deploy": "sst deploy",
		"remove": "sst remove",
		"console": "sst console",
    "test": "sst bind vitest"
	}
```

Now Run `pnpm run dev` command on terminal inside the service folder. It will deploy your stack changes and start Live Lambda Dev.## For DynamoDB communication

## Unit Tests

- Every service will have a `test` folder which will contain tests for respective handlers of the micro-service. Tests are written using `vitest`
- Tests can be executed by running `npm run test` or `pnpm run test`. This boilerplate is configured to use both.
- Service's `package.json` should have test script for npm/pnpm to execute it in all the packages.
- `vitest` and other supporting packages for executing tests are at the root `package.json` file. they are not requred in service's package.json file unless it is for specific use in that package

## Things accomplised in this boilerplate so far

- Structure for the monorepo approach
- Ability to add and use existing middlewares using middy
- CRUD operations with dynamoDB
- Supporting functions like validations (using ajv and middy), response parser
- Configured unit test cases using vitest.
- Add lambdas to existing VPC

## Problems that still exist

- We cannot place our lambdas in VPC while running application in dev. To put lambdas in VPC we need to deploy our application.
- After executing `pnpm run deploy --stage=staging` `stack.stage==='staging'` returned false. So cannot identify stage to make custom changes as per the deployment stage.
- While execulting tests collecting coverage faults. As per documentation we can easily collect coverage using `sst bind vitest --coverage`
- Using SST we can attach 1 domain per stack. Since this boilerplate follows multi stack approach we cannot connect our stacks to a single domain. **So the domain mapping needs to be implemented using Terraform or we need to restructure our stacks**

## FAQs

<details>
<summary>Why not use nx for managing monorepo?</summary>

_With the achievements made so far we explicity did not require nx. To execute tests from a single command npm workspaces is doing the trick. pnpm is helped dependency management._

_So **yes**, tomorrow we might need to include nx when we want some features that nx suppprts but npm or pnpm does not_

</details>

<details>
<summary>Why not use jest for writing tests?</summary>

_SST gives out of box support for vitest. When executing tests using vitest SST actually binds our AWS infra for executing tests. This capability is not supported with jest_

_If we don't need to bind then we can consider using jest_

</details>

<details>
