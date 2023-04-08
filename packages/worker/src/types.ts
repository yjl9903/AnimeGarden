export interface Env {
  database: D1Database;
}

export interface TeamTable {
  id: number;

  name: string;
}

export interface UserTable {
  id: number;

  name: string;
}

export interface ResourceTable {
  title: string;

  href: string;

  type: string;

  magnet: string;

  size: string;

  fansub?: number;

  publisher: number;

  createdAt: string;
}

export interface Database {
  user: UserTable;

  team: TeamTable;

  resource: ResourceTable;
}
