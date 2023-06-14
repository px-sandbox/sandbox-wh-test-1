export const searchedDataFormator = async (data: any) => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits.map((hit: any) => ({
      _id: hit._id,
      ...hit._source.body,
    }));
  }
  return [];
};
export const formatUserDataResponse = (data: any) => {
  return {
    id: data._id,
    githubId: data.id,
    userName: data.userName,
    avatarUrl: data.avatarUrl,
    organizationId: data.organizationId,
  };
};

export const formatRepoDataResponse = (data: any) => {
  return data.map((repo: any) => {
    return {
      id: repo._id,
      githubId: repo.id,
      name: repo.name,
      topics: repo.topics,
    };
  });
};
