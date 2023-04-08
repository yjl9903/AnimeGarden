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

export interface Database {
  user: UserTable;

  team: TeamTable;
}
