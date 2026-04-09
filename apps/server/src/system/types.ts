import type { ProviderType } from '@animegarden/client';
import type { RpcEventMap } from './rpc';

export interface Notification {
  resources: {
    inserted: NotifiedResource[];

    updated: NotifiedResource[];

    deleted: number[];
  };

  duplicated: {
    attached: number[];

    detached: number[];
  };
}

export interface NotifiedResource {
  id: number;

  provider: ProviderType;

  providerId: string;

  title: string;
}

export interface ResourcesAdminAck {
  status: 'OK';

  mode: 'queued' | 'already_running';

  job: 'fetch' | 'sync';

  provider: ProviderType;
}

export interface ResourcesFetchRpcPayload {
  provider: ProviderType;
}

export interface ResourcesSyncRpcPayload {
  provider: ProviderType;

  start: number;

  end: number;
}

export interface ResourcesRpcEventMap extends RpcEventMap {
  'resources.fetch': {
    payload: ResourcesFetchRpcPayload;
    reply: ResourcesAdminAck;
  };
  'resources.sync': {
    payload: ResourcesSyncRpcPayload;
    reply: ResourcesAdminAck;
  };
}
