export interface UserInfo {
  name: string;

  avatar?: string | null;

  provider: string;

  providerId: string;

  /** Time when this name was used by a resource. */
  usedAt: Date;
}

export interface TeamInfo extends UserInfo {}
