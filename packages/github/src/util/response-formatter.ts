export const searchedDataFormator = async (data: any) => {
  const response = null;
  if (data?.body.hits?.max_score != null) {
    return data.body.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source.body,
    }));
  }
  return response;
};
