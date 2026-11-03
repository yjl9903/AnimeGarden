/**
 * Structural types shared by every Host tool in this bundle.
 *
 * The Host half depends only on the public Anime Garden internal libraries, so
 * the minimal Cordis/tool-registry/web-server contract the plugin uses is
 * described here instead of importing Harness implementation types.
 */

/** One model-facing content block returned by a tool's `output.render`. */
export interface ContentBlock {
  type: 'text';
  text: string;
}

/** Resolved plugin config (bundle row `config`). */
export interface ResolvedOptions {
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
}
