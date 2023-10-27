import { User as ExternalApiUser } from '../external/api';

export type User = ExternalApiUser & {
  organization: string;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
};
