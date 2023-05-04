import { StackContext, Api, Table } from 'sst/constructs';
// import * as ec2 from 'aws-cdk-lib/aws-ec2';

export function usersStack({ stack }: StackContext) {
  /*
  Below is the implementation of how we can deploy our lambda in an existing VPC


  this VPC must have a private subnet that has a NAT gateway
  and the route table must have the entry for the NAT gateway
  Checklist for the VPC
  - VPC
  - private subnet
  - NAT gatewat connectted to private subnet
  - endpoint enabled to communicate with dynamoDB (or any other resource)
  - security group with traffic enabled both inbound outbound
  -
*/

  /**
   * following code is commented as lambda does not work in VPC in dev mode.
   * once you deploy following code can be used
   */

  // const vpc = ec2.Vpc.fromLookup(stack, 'VPC', {
  //   vpcId: 'vpc-02e582d796a35179c',
  // });
  // const sg = ec2.SecurityGroup.fromLookupById(
  //   stack,
  //   'sg',
  //   'sg-0a73047f63f72af5c'
  // );

  const usersTable = new Table(stack, 'users', {
    fields: {
      email: 'string',
      password: 'string',
      firstName: 'string',
      lastName: 'string',
      gender: 'string',
    },
    primaryIndex: { partitionKey: 'email' },
  });
  const usersAPI = new Api(stack, 'usersAPI', {
    defaults: {
      function: {
        bind: [usersTable],
        // vpc,
        // securityGroups: [sg],
      },
    },
    routes: {
      'POST /users': {
        function: {
          handler: 'packages/user-service/src/service/create-user.handler',
          bind: [usersTable],
        },
      },

      'GET /users': 'packages/user-service/src/service/get-user-list.handler',
      'GET /users/{email}':
        'packages/user-service/src/service/get-user.handler',
      'DELETE /users/{email}':
        'packages/user-service/src/service/delete-user.handler',
      'PUT /users/{email}':
        'packages/user-service/src/service/update-user.handler',
    },
  });
  stack.addOutputs({
    ApiEndpoint: usersAPI.url,
  });
}
