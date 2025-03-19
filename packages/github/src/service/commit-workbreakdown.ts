interface WorkBreakdown {
  newFeature: number;
  refactor: number;
  rewrite: number;
}

interface CommitWorkBreakdown {
  commitId: string;
  repoId: string;
  orgId: string;
  workbreakdown: WorkBreakdown;
}

export const handler = async (event: { body: string }) => {
  try {
    const commits: CommitWorkBreakdown[] = JSON.parse(event.body);

    // Log each commit's workbreakdown
    commits.forEach((commit) => {
      // TODO: save to ES
      console.log('Commit Workbreakdown:', {
        commitId: commit.commitId,
        repoId: commit.repoId,
        orgId: commit.orgId,
        workbreakdown: commit.workbreakdown,
      });
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Workbreakdown data logged successfully' }),
    };
  } catch (error) {
    console.error('Error processing workbreakdown data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process workbreakdown data' }),
    };
  }
}; 