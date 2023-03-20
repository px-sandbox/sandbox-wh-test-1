export const userRoutes = {
  'GET /': 'packages/functions/src/lambda.handler',
  'POST /signup': 'packages/functions/src/signup.handler',
  // {
  //   function: "src/signup.handler",
  //   authorizer: "none",
  // },
  'GET /notes': 'packages/functions/src/list.handler',
  // {
  //   function: "src/list.handler",
  //   authorizer: "none",
  // },
  'GET /notes/{id}': 'packages/functions/src/get.handler',
  // {
  //   function: "src/get.handler",
  //   authorizer: "none",
  // },
  'PUT /notes/{id}': 'packages/functions/src/update.handler',
};
