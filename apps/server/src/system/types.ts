import type { ProviderType } from '@animegarden/client';

import type { RpcEventMap } from './rpc.ts';

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

/** Fields currently supported by the resource patch operation. */
export interface ResourcePatch {
  subjectId?: number;

  detail?: true;
}

export interface ResourcePatchRpcPayload {
  provider: ProviderType;

  providerId: string;

  patch: ResourcePatch;
}

export interface ResourcePatchSuccess {
  status: 'OK';

  changed: boolean;

  previous: {
    subjectId: number | null;
  };

  resource: NotifiedResource & {
    subjectId: number | null;
  };

  detailRefreshed?: boolean;
}

export interface ResourcePatchError {
  status: 'ERROR';

  code: 'RESOURCE_NOT_FOUND' | 'SUBJECT_NOT_FOUND';

  message: string;
}

export type ResourcePatchAck = ResourcePatchSuccess | ResourcePatchError;

export interface ResourcesRpcEventMap extends RpcEventMap {
  'resources.fetch': {
    payload: ResourcesFetchRpcPayload;
    reply: ResourcesAdminAck;
  };
  'resources.sync': {
    payload: ResourcesSyncRpcPayload;
    reply: ResourcesAdminAck;
  };
  'resources.patch': {
    payload: ResourcePatchRpcPayload;
    reply: ResourcePatchAck;
  };
}
