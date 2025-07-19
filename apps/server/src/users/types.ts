export interface UserInfo {
  name: string;

  avatar?: string | null;

  provider: string;

  providerId: string;
}

export interface TeamInfo extends UserInfo {}
