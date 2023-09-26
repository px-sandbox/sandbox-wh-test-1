// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const esResponseDataFormator = async (data: any): Promise<any> => {
  if (data?.hits?.max_score != null) {
    return data.hits.hits
      .filter(
        (hit: Hit) =>
          typeof hit._source.body.isDeleted === 'undefined' || hit._source.body.isDeleted === false
      )
      .map((hit: Hit) => ({
        _id: hit._id,
        ...hit._source.body,
      }));
  }
  return [];
};
