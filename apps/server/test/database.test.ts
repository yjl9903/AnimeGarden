import { describe, expect, it } from 'vitest';

import { getDatabaseConnectOptions } from '../src/connect/database';
import { shouldRetryDatabaseError } from '../src/utils/database';

describe('database connection profiles', () => {
  it('uses short timeouts for server requests', () => {
    expect(getDatabaseConnectOptions('server')).toMatchInlineSnapshot(`
      {
        "connection": {
          "application_name": "animegarden-server",
          "idle_in_transaction_session_timeout": 15000,
          "lock_timeout": 1000,
          "statement_timeout": 3000,
        },
        "idle_timeout": 60,
        "max": 5,
        "max_lifetime": 1800,
      }
    `);
  });

  it('uses a relaxed timeout profile for cron and no statement timeout for cli', () => {
    expect(getDatabaseConnectOptions('cron')).toMatchInlineSnapshot(`
      {
        "connection": {
          "application_name": "animegarden-cron",
          "idle_in_transaction_session_timeout": 30000,
          "lock_timeout": 5000,
          "statement_timeout": 60000,
        },
        "idle_timeout": 60,
        "max": 5,
        "max_lifetime": 1800,
      }
    `);

    expect(getDatabaseConnectOptions('cli')).toMatchObject({
      connection: {
        application_name: 'animegarden-cli'
      }
    });
  });
});

describe('database retry policy', () => {
  it('does not retry PostgreSQL timeout and lock timeout errors', () => {
    expect(
      shouldRetryDatabaseError({
        code: '57014',
        message: 'canceling statement due to statement timeout'
      })
    ).toBe(false);

    expect(
      shouldRetryDatabaseError({
        code: '55P03',
        message: 'canceling statement due to lock timeout'
      })
    ).toBe(false);
  });

  it('keeps retrying other errors', () => {
    expect(
      shouldRetryDatabaseError({
        code: '08006',
        message: 'connection failure'
      })
    ).toBe(true);
  });
});
