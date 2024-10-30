export interface IOrganisation {
  _id: string;
  id: string;
  githubOrganizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
export interface IformatUserDataResponse {
  _id: number;
  id: number;
  githubId: number;
  userName: string;
  avatarUrl: string;
  organizationId: string;
}
export interface IRepo {
  id: number;
  _id: number;
  githubId: string;
  name: string;
  topics: string;
  organizationId: string;
}
export type Hit = {
  _id: string;
  _source: {
    body: {
      isDeleted?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};
