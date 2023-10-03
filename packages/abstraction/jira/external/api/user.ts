export type User = {
  self: string;
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
};
