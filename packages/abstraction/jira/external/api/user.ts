import { UserType } from '../../enums/user-type';

export type User = {
  self: string;
  accountId: string;
  avatarUrls: {
    '48x48': string;
    '32x32': string;
    '24x24': string;
    '16x16': string;
  };
  displayName: string;
  active: boolean;
  timeZone: string;
  accountType: UserType;
  emailAddress?: string;
  groups?: {
    size: number;
    items: object[];
  };
  applicationRoles?: {
    size: number;
    items: object[];
  };
};
