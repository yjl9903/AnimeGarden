import { describe, expect, it } from 'vitest';

import { getDatabaseConnectOptions } from '../src/connect/database';
import { shouldRetryDatabaseError } from '../src/utils/database';

describe('database connection profiles', () => {
  it('uses short timeouts for server requests', () => {
    expect(getDatabaseConnectOptions('server')).toMatchObject({
      max: 5,
      idle_timeout: 60,
      max_lifetime: 60 * 30,
      connection: {
        application_name: 'animegarden-server',
        statement_timeout: 3_000,
        lock_timeout: 1_000,
        idle_in_transaction_session_timeout: 15_000
      }
    });
  });

  it('uses a relaxed timeout profile for cron and no statement timeout for cli', () => {
    expect(getDatabaseConnectOptions('cron')).toMatchObject({
      connection: {
        application_name: 'animegarden-cron',
        statement_timeout: 30_000,
        lock_timeout: 2_000,
        idle_in_transaction_session_timeout: 30_000
      }
    });

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
