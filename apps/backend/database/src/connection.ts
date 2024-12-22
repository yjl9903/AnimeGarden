export class Context {}

export interface ConnectOptions {
  postgresUri?: string;

  redisUri?: string;
}

export function connect(options: ConnectOptions) {}
