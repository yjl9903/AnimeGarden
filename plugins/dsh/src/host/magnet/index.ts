/**
 * Magnet opening: hand a magnet URI from the Web UI to the OS default client.
 *
 * The DSH shell blocks `magnet:` navigation, and page JavaScript cannot start a
 * desktop application, so the panel row and the chat result card post the URI
 * to this same-origin route. The route sits behind the connection trust fence, validates
 * the URI, and spawns the platform opener with an argv-only request — the URI is
 * never shell-interpreted, and the opener's child environment is the harness's
 * scrubbed one.
 */

import type {
  HostWebContext,
  SubprocessHandle,
  WebRouteRequest,
  WebRouteResponse
} from '../shared/types';

import { isMagnetUri, MAX_MAGNET_LENGTH, OPEN_MAGNET_PATH } from '../../shared/magnet';

/** Request-body ceiling; a magnet URI is the only field, so anything bigger is hostile. */
const MAX_BODY_BYTES = MAX_MAGNET_LENGTH + 1024;

/** How long one launch may take before the hand-off counts as done. */
const LAUNCH_TIMEOUT_MS = 5_000;

/** Bounded output kept from the opener for failure diagnostics. */
const OPENER_OUTPUT_BYTES = 4 * 1024;

/** Exit grace handed to the subprocess provider for the opener. */
const OPENER_GRACE_MS = 1_000;

/**
 * The Host process facts this module reads.
 *
 * Declared locally so the dependency-free bundle needs no Node type package;
 * the values are the standard Node globals at the plugin's runtime.
 */
declare const process: { platform: string; cwd(): string };

/** One platform's way to hand a URI to its registered application. */
interface UriLauncher {
  /** Executable name resolved through the exec-world PATH. */
  command: string;
  /** Arguments appended after the executable; the URI is the last one. */
  prefix: string[];
}

/**
 * Pick the platform's URI opener.
 *
 * Windows uses `rundll32`'s FileProtocolHandler instead of `cmd /c start`,
 * because a magnet URI carries `&` query separators that a command shell would
 * split into separate commands; the opener receives the URI as one argv item.
 *
 * @param platform - `process.platform` from the Host process.
 * @returns the launcher, or `null` for a platform this plugin cannot open.
 */
function launcherFor(platform: string): UriLauncher | null {
  if (platform === 'darwin') return { command: 'open', prefix: [] };
  if (platform === 'win32')
    return { command: 'rundll32.exe', prefix: ['url.dll,FileProtocolHandler'] };
  if (platform === 'linux') return { command: 'xdg-open', prefix: [] };
  return null;
}

/** Sentinel returned when the opener has not exited inside the launch window. */
const LAUNCH_TIMEOUT = Symbol('launch-timeout');

/**
 * Race one promise against the launch window.
 * @param promise - the opener's completion promise.
 * @returns the promise's value, or {@link LAUNCH_TIMEOUT}.
 */
async function raceLaunchWindow<T>(promise: Promise<T>): Promise<T | typeof LAUNCH_TIMEOUT> {
  const timeout = new Promise<typeof LAUNCH_TIMEOUT>((resolve) => {
    setTimeout(() => resolve(LAUNCH_TIMEOUT), LAUNCH_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Read one collected stream's bounded text without throwing.
 * @param handle - the finished opener.
 * @returns the captured standard error, or an empty string.
 */
function openerStderr(handle: SubprocessHandle): string {
  try {
    return (handle.collected?.stderr?.readFrom(0).text ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * Launch the OS handler for one magnet URI.
 *
 * A non-zero exit is the opener's own failure report (for example macOS
 * `open` finding no registered BitTorrent client), so it becomes the route's
 * error message. A still-running opener after the launch window counts as a
 * successful hand-off and is not killed.
 *
 * @param ctx - Host context carrying the subprocess service.
 * @param magnet - validated magnet URI.
 * @throws when the platform has no opener, resolution fails, or the opener exits non-zero.
 */
async function launchMagnet(ctx: HostWebContext, magnet: string): Promise<void> {
  const launcher = launcherFor(process.platform);
  if (launcher === null) throw new Error(`unsupported platform: ${process.platform}`);

  const executable = await ctx.subprocess.resolveExecutable(launcher.command);
  const handle = ctx.subprocess.spawn({
    argv: [executable, ...launcher.prefix, magnet],
    cwd: process.cwd(),
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: OPENER_OUTPUT_BYTES },
      stderr: { maxBytes: OPENER_OUTPUT_BYTES }
    },
    graceMs: OPENER_GRACE_MS
  });

  const outcome = await raceLaunchWindow(handle.done);
  if (outcome === LAUNCH_TIMEOUT) return;
  if (outcome.exitCode === 0) return;

  const stderr = openerStderr(handle);
  const detail = stderr !== '' ? stderr : `exit code ${String(outcome.exitCode)}`;
  throw new Error(`the system could not open the magnet link (${detail})`);
}

/** Write one JSON response without caching the launch outcome. */
function sendJson(
  response: WebRouteResponse,
  status: number,
  payload: Record<string, unknown>
): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(payload));
}

/** 405 with the route's single supported method. */
function sendMethodNotAllowed(response: WebRouteResponse): void {
  response.statusCode = 405;
  response.setHeader('allow', 'POST');
  response.end();
}

/**
 * Collect a bounded UTF-8 request body.
 * @param request - the incoming request.
 * @returns the body text, or `null` when it exceeds the ceiling.
 */
async function readBoundedBody(request: WebRouteRequest): Promise<string | null> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return new TextDecoder().decode(chunkBytes(chunks));
}

/** Concatenate body chunks into one byte array. */
function chunkBytes(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Validate the request body: a JSON object whose only meaningful field is a
 * magnet URI.
 * @param text - request body text.
 * @returns the validated URI, or `null`.
 */
function parseMagnetBody(text: string): string | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const magnet = (body as Record<string, unknown>).magnet;
  return typeof magnet === 'string' && isMagnetUri(magnet) ? magnet : null;
}

/**
 * Answer one open-magnet request.
 *
 * The trust fence runs first: the connection service applies the deployment's
 * Host/Origin checks and browser authentication, so an unauthenticated caller
 * never reaches validation or a process spawn.
 *
 * @param ctx - Host context carrying the web server, connection, and subprocess services.
 * @param request - the incoming request.
 * @param response - the response owned by this route.
 */
async function handleOpenMagnet(
  ctx: HostWebContext,
  request: WebRouteRequest,
  response: WebRouteResponse
): Promise<void> {
  const rejection = ctx.connection.requestRejection(request);
  if (rejection !== undefined) {
    response.statusCode = rejection;
    response.end();
    return;
  }

  if ((request.method ?? '').toUpperCase() !== 'POST') {
    sendMethodNotAllowed(response);
    return;
  }

  const contentType = String(request.headers['content-type'] ?? '')
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    sendJson(response, 415, {
      code: 'unsupported-media-type',
      message: 'content-type must be application/json'
    });
    return;
  }

  let text: string | null;
  try {
    text = await readBoundedBody(request);
  } catch {
    sendJson(response, 400, { code: 'bad-request', message: 'request body unreadable' });
    return;
  }
  if (text === null) {
    sendJson(response, 413, { code: 'payload-too-large', message: 'request body is too large' });
    return;
  }

  const magnet = parseMagnetBody(text);
  if (magnet === null) {
    sendJson(response, 400, {
      code: 'invalid-magnet',
      message: 'request body must be JSON with a BitTorrent magnet URI in "magnet"'
    });
    return;
  }

  try {
    await launchMagnet(ctx, magnet);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 502, {
      code: 'launch-failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Register the open-magnet route on the Harness web server.
 *
 * Runs only when the web, connection, and subprocess services are all present,
 * so the plugin keeps providing its search tool in CLI/headless profiles.
 *
 * @param ctx - Host context with the required services.
 */
export function registerOpenMagnetRoute(ctx: HostWebContext): void {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: OPEN_MAGNET_PATH,
        handler: (request, response) => handleOpenMagnet(ctx, request, response)
      }),
    'animegarden: open magnet route'
  );
}
