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
  accountType: string;
  organization: string;
  emailAddress?: string | null;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  username?: string;
};
