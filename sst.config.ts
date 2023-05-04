import { SSTConfig } from 'sst';
import { productsStack } from './stacks/product';
import { usersStack } from './stacks/users';

export default {
  config(_input) {
    return {
      name: 'my-sst-app',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    app.stack(usersStack);
    app.stack(productsStack);
  },
} satisfies SSTConfig;
