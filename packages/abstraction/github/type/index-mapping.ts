export type IndexMapping = {
  properties: {
    [key: string]: {
      type: string;
      format?: string;
    };
  };
};
