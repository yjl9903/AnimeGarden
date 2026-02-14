import type { Path } from 'breadfs';
import type { NodeProvider } from 'breadfs/node';
import type { WebDAVProvider } from 'breadfs/webdav';
import type { AliyunDriveProvider } from 'breadfs/aliyundrive';

export { fs as LocalFS } from 'breadfs/node';

export type LocalPath = Path<NodeProvider>;

export type StoragePath = Path<NodeProvider | WebDAVProvider | AliyunDriveProvider>;
