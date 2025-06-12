export interface WorkflowRunCompleted {
  action: string;
  workflow_run: {
    id: string;
    name: string;
    node_id: string;
    head_branch: string;
    head_sha: string;
    path: string;
    display_title: string;
    status: string;
    conclusion: string;
  };
  pull_request: {
    id: string;
    number: string;
    title: string;
    body: string;
    created_at: string;
    head: {
      ref: string;
      id: string;
      name: string;
      full_name: string;
    };
  };
  repository: {
    id: string;
    name: string;
    full_name: string;
  };
  organization: {
    login: string;
    id: string;
  };
  sender: {
    login: string;
    id: string;
  };
  installation: {
    id: string;
  };
  workflow: {
    id: string;
    name: string;
  };
}
