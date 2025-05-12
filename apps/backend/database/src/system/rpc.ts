import { createConsola } from 'consola';

const logger = createConsola().withTag('rpc');

export interface RpcPayload<T = any> {
  type: string;

  gid: string;

  payload: T;
}

export type RpcEventMap = Record<string, { payload: any; reply: any }>;

export interface RpcBus<E extends RpcEventMap> {
  define: <K extends keyof E>(
    type: K,
    handler: (payload: E[K]['payload']) => Promise<E[K]['reply']>
  ) => void;

  run: <K extends keyof E>(type: K, payload: E[K]['payload']) => Promise<E[K]['reply'] | undefined>;

  invoke: <K extends keyof E>(
    type: K,
    payload: E[K]['payload']
  ) => Promise<E[K]['reply'] | undefined>;
}

export interface RpcSender {
  send: (payload: RpcPayload) => Promise<boolean>;

  reply: (payload: RpcPayload) => void;
}

export function makeRpcBus<E extends RpcEventMap>(): { sender: RpcSender; rpc: RpcBus<E> } {
  const cbs = new Map<string, Function>();
  const tasks = new Map<string, (payload: RpcPayload) => void>();

  const sender: RpcSender = {
    send: async () => false,
    reply: async (payload) => {
      const { gid } = payload;
      const task = tasks.get(gid);
      if (task) {
        task(payload);
      }
    }
  };

  const send = async (type: string, payload: any) => {
    return new Promise<RpcPayload>(async (res) => {
      const gid = crypto.randomUUID();

      let resolved = false;
      const ev = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          res({ type, gid, payload: undefined });
        }
      }, 30 * 1000);

      tasks.set(gid, (resp) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(ev);
          res(resp);
        }
      });

      try {
        const req = { type, gid, payload };
        const ok = await sender.send(req);
        if (ok) return;
      } catch (error) {
        logger.error(`Send rpc invoke failed ${payload}`, error);
      }

      if (!resolved) {
        resolved = true;
        clearTimeout(ev);
        res({ type, gid, payload: undefined });
      }
    });
  };

  const instance = {
    define(type: string, handler: (payload: any) => Promise<any>) {
      cbs.set(type, handler);
    },
    async run(type: string, payload: any) {
      try {
        const cb = cbs.get(type);
        if (!cb) return undefined;
        return await cb(payload);
      } catch (error) {
        logger.error(`Handle rpc invoke failed ${payload}`, error);
        return undefined;
      }
    },
    async invoke(type: string, payload: any) {
      const resp = await send(type, payload);
      return resp.payload;
    }
  } as RpcBus<E>;

  return { sender, rpc: instance };
}
