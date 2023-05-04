import { StackContext, Api, Table } from 'sst/constructs';

export function productsStack({ stack }: StackContext) {
  const productsTable = new Table(stack, 'products', {
    fields: {
      sku: 'string',
      title: 'string',
      category: 'string',
      subCategory: 'string',
    },
    primaryIndex: { partitionKey: 'sku' },
  });
  const productsAPI = new Api(stack, 'productsAPI', {
    defaults: {
      function: {
        bind: [productsTable],
      },
    },
    routes: {
      'POST /products': {
        function: {
          handler:
            'packages/product-service/src/service/create-product.handler',
          bind: [productsTable],
        },
      },

      'GET /products':
        'packages/product-service/src/service/get-product-list.handler',
      'GET /products/{email}':
        'packages/product-service/src/service/get-product.handler',
      'DELETE /products/{email}':
        'packages/product-service/src/service/delete-product.handler',
      'PUT /products/{email}':
        'packages/product-service/src/service/update-product.handler',
    },
  });
  stack.addOutputs({
    ApiEndpoint: productsAPI.url,
  });
}
