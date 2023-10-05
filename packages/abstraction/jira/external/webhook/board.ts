export type Board = {
  id: number;
  self: string;
  name: string;
  type: string;
};

export interface BoardConfig extends Board {
  location: {
    type: string;
    key: string;
    id: string;
    self: string;
    name: string;
  };
  filter: {
    id: string;
    self: string;
  };
  columnConfig: {
    columns: {
      name: string;
      statuses: {
        id: string;
        self: string;
      }[];
    }[];
    constraintType: string;
  };
  ranking: {
    rankCustomFieldId: number;
  };
}
