/**
 * Structural types shared by every Host tool in this bundle.
 *
 * The Host half depends only on the public Anime Garden internal libraries, so
 * the minimal Cordis/tool-registry/web-server contract the plugin uses is
 * described here instead of importing Harness implementation types.
 */

import type { PluginOptions } from '../../shared/config';

/** One model-facing content block returned by a tool's `output.render`. */
export interface ContentBlock {
  type: 'text';
  text: string;
}

/** Resolved plugin config (bundle row `config`): the API endpoint plus browser options. */
export interface ResolvedOptions extends PluginOptions {
  baseURL: string;
}

/** Tool-call context handed to `execute` by the registry (only `signal` is used). */
export interface ToolRunContext {
  signal?: AbortSignal;
}

/** One Host tool as published on the tool registry. */
export interface ToolDefinition<Result> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  output: {
    schema: Record<string, unknown>;
    render(args: unknown, value: Result): ContentBlock[];
  };
  timeoutMs?: number;
  isConcurrencySafe?: () => boolean;
  execute(args: unknown, exec: ToolRunContext): Promise<Result>;
}

/** The Cordis plugin context subset the tools require (the `tools` service). */
export interface PluginToolContext {
  tools: {
    register<Result>(definition: ToolDefinition<Result>): () => void;
  };

  /**
   * Optional-service entry point: the callback runs with a context that has the
   * listed services, and the plugin stays active in profiles without them.
   */
  inject?(dependencies: string[], callback: (ctx: HostWebContext) => void): unknown;
}

/** One Host HTTP request as a route handler reads it. */
export interface WebRouteRequest {
  /** HTTP method, upper-case per Node. */
  method?: string | undefined;
  /** Request headers keyed by lower-case name. */
  headers: Record<string, string | string[] | undefined>;
  /** Raw body chunks; the handler decides how much to read. */
  [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array>;
}

/** One Host HTTP response as a route handler writes it. */
export interface WebRouteResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

/** Route registration surface of the Harness web server service. */
export interface WebServerService {
  register(route: {
    kind: 'exact';
    path: string;
    handler: (request: WebRouteRequest, response: WebRouteResponse) => Promise<void> | void;
  }): () => void;
}

/**
 * The connection service's trust fence: Host/Origin checks plus browser
 * authentication. Returning `undefined` admits the request.
 */
export interface ConnectionService {
  requestRejection(request: { headers: WebRouteRequest['headers'] }): 401 | 403 | undefined;
}

/** One fully specified child-process spawn request (no shell interpretation). */
export interface SubprocessSpawnSpec {
  argv: string[];
  cwd: string;
  stdio: {
    stdin: 'ignore';
    stdout: { maxBytes: number };
    stderr: { maxBytes: number };
  };
  graceMs: number;
}

/** Bounded collected output of one finished child stream. */
export interface SubprocessCollectedStream {
  /** Read retained text and its cursor metadata from a whole-stream byte offset. */
  readFrom(offset: number): {
    text: string;
    nextOffset: number;
    lossy: boolean;
    spillPath?: string;
  };
}

/** One running child process as the subprocess service reports it. */
export interface SubprocessHandle {
  done: Promise<{ exitCode: number | null; signal: string | null }>;
  collected?: {
    stdout?: SubprocessCollectedStream;
    stderr?: SubprocessCollectedStream;
  };
}

/** One structured index injection row the web server renders into the page. */
export interface HostIndexInjection {
  kind: 'global';
  name: string;
  value: unknown;
}

/** The Host services the web-facing capabilities need (absent in CLI/headless profiles). */
export interface HostWebContext {
  effect(effect: () => (() => void) | void, label?: string): unknown;
  on(event: string, listener: (table: HostIndexInjection[]) => void): () => void;
  webServer: WebServerService;
  connection: ConnectionService;
  subprocess: {
    resolveExecutable(command: string): Promise<string>;
    spawn(spec: SubprocessSpawnSpec): SubprocessHandle;
  };
}
