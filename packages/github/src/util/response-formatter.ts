export const searchedDataFormator = async (data: any) => {
  const response = null;
  if (data?.hits?.max_score != null) {
    return data.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source.body,
    }));
  }
  return response;
};
