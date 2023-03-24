
# Serverless with SST

Boilerplate for SST serverless APIs
## File and folder Naming conventions

- Folder and file name will be singular and follow `kebab-case`
- Classes and interfaces Names will be singular and follow `PascalCasing`
- Any global constants or environment variables are in `all-caps` and follow `SNAKE_CASE`
- Variable name should be `camelCase`

For more details onto casing refer [here](https://medium.com/better-programming/string-case-styles-camel-pascal-snake-and-kebab-case-981407998841)
## Monorepo architecture

```
.
├── packages
│    ├── sample-package
│    │    ├── index.ts # export types or functions
│    │    ├── package.json 
├── services
│    ├── sample-service
│    │    ├── functions
│    │    │    ├── sample-function.ts # functions to use your service
│    │    ├── routes
│    │    │    ├── index.ts
│    │    ├── stacks
│    │    │    ├── my-stack.ts # example
│    │    │    ├── storage.ts # example
│    │    ├── package.json
│    │    ├── tsconfig.json
├── ...
├── nx.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── ...
```  






## For API Creation

Create a service in our `services` folder and fill it with:

- `sst.config.ts` file - For sst configuration
- `stacks` folder - For sst stacks
- `routes` folder - To store routes
- `functions` folder - To store functions

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

The `routes` folder should have a file to export your routes, like this:

```typescript
export const crudRoutes = {
  'HTTP-METHOD /endpoint': 'path/to/function',
  'GET /example': 'functions/example'
};

```

The `functions` folder should contain all your functions to run through routes, for example:

```typescript
// lambda.ts

import { ApiHandler } from 'sst/node/api';

export const handler = ApiHandler(async (_evt) => {
  return {
    body: `Hello world.`,
  };
});
```
Functions must been called `handler` to sst indentifies as a function.


The `stacks` folder should have a file to export your main stack, importing your routes and functions, like this:

```typescript
import { Api, StackContext } from 'sst/constructs';
import { exampleRoutes } from '../routes';

export function API({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    routes: exampleRoutes,
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}

```






## Deploy Service

  - Install node 16.* and npm 8.*
  - Setup aws credentials by exporting the credentials on terminal.
  
**Check by command if token is expired**
```
aws sts get-caller-identity
```
**Note:** If token expired then again need to be export the credentials on the terminal.

## Implement JWT Authorization with Auth0
  - Create an account on Auth0 and create a single page application. 
  - On created application's settings you will get domain and client id.
  - Create .env.local file in the root project and set the below keys with your values.
```
AUTH0_DOMAIN=https://your-domain
AUTH0_CLIENT_ID=client-id
```
Add these scripts in the package.json file of the service:

```
	"scripts": {
		"dev": "sst dev",
		"build": "sst build",
		"deploy": "sst deploy",
		"remove": "sst remove",
		"console": "sst console",
	}
```

Now Run `pnpm run dev` command on terminal inside the service folder. It will deploy your stack changes and start Live Lambda Dev.## For DynamoDB communication

After setting up SST, create a file in your `stacks` folder that creates a table:
```
import { Table } from 'sst/constructs';

export function Storage({ stack, app }) {
  const table = new Table(stack, 'CrudTest', {
    fields: {
      id: 'string',
      field1: 'string',
      field2: 'string',
    },
    primaryIndex: { partitionKey: 'id' },
  });

  return {
    table,
  };
}

```

And then, simply add this line in your desided function/package:
```typescript
const dynamoDb = new DynamoDB.DocumentClient();
```
And use `dynamoDb` to run queries in that table.
> For more information of DynamoDB methods: [docs](https://www.npmjs.com/package/dynamodb)
## Packages

For using types or utils functions, create packages in `packages` folder, and add a `index.ts` file and a `package.json`file. For example:

```typescript
// index.ts

export interface User {
    username: string;
    password: string;
}
```

```typescript
// package.json

{
	"name": "user-types",
	"version": "0.0.0",
	"main": "dist/index.js",
	"devDependencies": {
		"typescript": "^4.9.5"
	},
	"scripts": {
		"build": "tsc index.ts --outDir dist"
	}
}
```

