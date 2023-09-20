import { Api, Config, StackContext, use } from 'sst/constructs';
import { commonConfig } from './common/config';

export function jira({ stack }: StackContext): { jiraApi: Api<Record<string, any>> } {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
  const JIRA_CLIENT_ID = new Config.Secret(stack,'JIRA_CLIENT_ID');
  const JIRA_CLIENT_SECRET = new Config.Secret(stack,'JIRA_CLIENT_SECRET');
  const JIRA_CALLBACK_URL = new Config.Secret(stack,'JIRA_CALLBACK_URL');
  
  const jiraApi = new Api(stack, 'jiraApi', {
    defaults: {
      function: {
        timeout: '30 seconds',
        bind: [OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME],
      },
    },
    routes: {
      // GET create all ES indices
      'GET /jira/create-indices': {
        function: 'packages/jira/src/service/create-indices.handler',
      },
      'POST /jira/webhook': {
        function: 'packages/jira/src/webhook/webhook.handler',
      },
      'GET /jira/initialize': {
        function: 'packages/jira/src/service/initialize.handler'
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: jiraApi.url,
  });
  return { jiraApi };
}
