import { customType } from 'drizzle-orm/pg-core';

export const tsVector = customType<{ data: Array<string[] | undefined> }>({
  dataType() {
    return 'tsvector';
  }
});
