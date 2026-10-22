import { loadEnvFile } from 'node:process';

/** Load optional .env configuration without overriding the process environment. */
export function loadEnvironment() {
  try {
    loadEnvFile();
  } catch (error) {
    // Deployments may supply all configuration through the process environment.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
