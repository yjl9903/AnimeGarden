import type { Path } from 'breadfs';
import type { NodeFS } from 'breadfs/node';
import type { WebDAVProvider } from 'breadfs/webdav';

export { fs as LocalFS } from 'breadfs/node';

export type LocalPath = Path<typeof NodeFS>;

export type StoragePath = Path<typeof NodeFS | WebDAVProvider>;
