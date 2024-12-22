import { customType } from 'drizzle-orm/pg-core';

export const tsVector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  }
});
