export type DeploymentFreq={
    _id: string;
    body: {
      id: string;
      source: string;
      destination: string;
      repoId: string;
      orgId: string;
      createdAt: string|Date;
      env: string;
      date: string|Date;
    };
};